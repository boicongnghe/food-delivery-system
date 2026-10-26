import CommissionRule from '../models/CommissionRule.js';
import Complaint, { COMPLAINT_STATUSES } from '../models/Complaint.js';
import DeliveryIssue, { DELIVERY_ISSUE_STATUSES, PENALTY_ACTIONS } from '../models/DeliveryIssue.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Review from '../models/Review.js';
import { addDays, startOfVietnamDay } from '../utils/date.js';
import { resolveRate } from './commissionRuleService.js';
import { countByStatus } from './feedbackPolicy.js';
import { VISIBLE_TO_RESTAURANT_FILTER } from './orderPolicy.js';

const MAX_DAILY_POINTS = 62; // longer ranges are grouped by month
const TOP_RESTAURANT_COUNT = 5;

const percentOf = (amount, rate) => Math.round((amount * rate) / 100);
const roundRating = (value) => (value ? Math.round(value * 10) / 10 : 0);

// Every day (or month) of the range, so periods without orders still show as 0 in the chart
const listPeriods = (from, to, groupBy) => {
  const keys = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const key = groupBy === 'day' ? day : day.slice(0, 7);
    if (keys[keys.length - 1] !== key) keys.push(key);
  }
  return keys;
};

// One row per (Vietnam day, restaurant, status). Online orders never paid are abandoned checkouts, not orders.
const groupOrders = (start, end) =>
  Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, ...VISIBLE_TO_RESTAURANT_FILTER } },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } },
          restaurant: '$restaurant',
          status: '$status',
        },
        orders: { $sum: 1 },
        total: { $sum: '$total' },
        subtotal: { $sum: '$subtotal' },
        shippingFee: { $sum: '$shippingFee' },
        discount: { $sum: '$discount' },
        refunded: { $sum: '$payment.refundAmount' },
      },
    },
  ]);

const summarizeReviews = async (match) => {
  const [result] = await Review.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              hidden: { $sum: { $cond: ['$isHidden', 1, 0] } },
              // $avg skips null: hidden reviews do not count, same as the public ratings
              restaurantAverage: { $avg: { $cond: ['$isHidden', null, '$restaurantRating'] } },
              shipperAverage: { $avg: { $cond: ['$isHidden', null, '$shipperRating'] } },
            },
          },
        ],
        distribution: [{ $match: { isHidden: false } }, { $group: { _id: '$restaurantRating', count: { $sum: 1 } } }],
      },
    },
  ]);
  const totals = result.totals[0] || {};
  return {
    total: totals.total || 0,
    hidden: totals.hidden || 0,
    restaurantAverage: roundRating(totals.restaurantAverage),
    shipperAverage: roundRating(totals.shipperAverage),
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: result.distribution.find((group) => group._id === stars)?.count || 0,
    })),
  };
};

const summarizeComplaints = async (match, start, end) => {
  const [counts, refunds] = await Promise.all([
    countByStatus(Complaint, match, COMPLAINT_STATUSES),
    // Compensation belongs to the day it was decided, like a payment
    Complaint.aggregate([
      { $match: { status: 'resolved', 'resolution.at': { $gte: start, $lt: end } } },
      { $group: { _id: null, amount: { $sum: '$resolution.refundAmount' } } },
    ]),
  ]);
  return { ...counts, refundAmount: refunds[0]?.amount || 0 };
};

const summarizeDeliveryIssues = async (match) => {
  const [counts, penaltyGroups] = await Promise.all([
    countByStatus(DeliveryIssue, match, DELIVERY_ISSUE_STATUSES),
    DeliveryIssue.aggregate([
      { $match: { ...match, 'resolution.penalty': { $ne: null } } },
      { $group: { _id: '$resolution.penalty.action', count: { $sum: 1 } } },
    ]),
  ]);
  const penalties = Object.fromEntries(
    PENALTY_ACTIONS.map((action) => [action, penaltyGroups.find((group) => group._id === action)?.count || 0]),
  );
  return { ...counts, penalties };
};

const loadTopRestaurants = async (statsByRestaurant) => {
  const top = [...statsByRestaurant.values()].sort((a, b) => b.gmv - a.gmv).slice(0, TOP_RESTAURANT_COUNT);
  const details = await Restaurant.find({ _id: { $in: top.map((item) => item.restaurant) } })
    .select('name rating ratingCount')
    .lean();
  return top.map(({ restaurant, ...stats }) => {
    const detail = details.find((item) => String(item._id) === String(restaurant));
    return {
      _id: restaurant,
      name: detail?.name || 'Nhà hàng đã xóa',
      rating: detail?.rating || 0,
      ratingCount: detail?.ratingCount || 0,
      ...stats,
    };
  });
};

/**
 * UC44 - report for Vietnam days [from, to]. Orders are counted on the day they were placed;
 * revenue and commission only include delivered orders.
 */
export const getAnalytics = async ({ from, to }) => {
  const start = startOfVietnamDay(from);
  const end = startOfVietnamDay(addDays(to, 1));
  const dayCount = listPeriods(from, to, 'day').length;
  const groupBy = dayCount > MAX_DAILY_POINTS ? 'month' : 'day';
  const createdInRange = { createdAt: { $gte: start, $lt: end } };

  const [orderGroups, rules, reviews, complaints, deliveryIssues] = await Promise.all([
    groupOrders(start, end),
    CommissionRule.find().lean(),
    summarizeReviews(createdInRange),
    summarizeComplaints(createdInRange, start, end),
    summarizeDeliveryIssues(createdInRange),
  ]);

  const series = new Map(
    listPeriods(from, to, groupBy).map((key) => [key, { key, orders: 0, delivered: 0, cancelled: 0, gmv: 0, commission: 0 }]),
  );
  const statsByRestaurant = new Map();
  const totals = {
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    gmv: 0,
    foodRevenue: 0,
    shippingFees: 0,
    discounts: 0,
    restaurantCommission: 0,
    shipperCommission: 0,
    cancellationRefunds: 0,
  };

  for (const group of orderGroups) {
    const { day, restaurant, status } = group._id;
    const point = series.get(groupBy === 'day' ? day : day.slice(0, 7));
    totals.totalOrders += group.orders;
    point.orders += group.orders;

    if (status === 'cancelled') {
      totals.cancelledOrders += group.orders;
      totals.cancellationRefunds += group.refunded;
      point.cancelled += group.orders;
    }
    if (status !== 'delivered') continue;

    const restaurantCommission = percentOf(group.subtotal, resolveRate(rules, 'restaurant', restaurant, day));
    const shipperCommission = percentOf(group.shippingFee, resolveRate(rules, 'shipper', null, day));
    totals.deliveredOrders += group.orders;
    totals.gmv += group.total;
    totals.foodRevenue += group.subtotal;
    totals.shippingFees += group.shippingFee;
    totals.discounts += group.discount;
    totals.restaurantCommission += restaurantCommission;
    totals.shipperCommission += shipperCommission;
    point.delivered += group.orders;
    point.gmv += group.total;
    point.commission += restaurantCommission + shipperCommission;

    const key = String(restaurant);
    const stats = statsByRestaurant.get(key) || { restaurant, orders: 0, gmv: 0, commission: 0 };
    stats.orders += group.orders;
    stats.gmv += group.total;
    stats.commission += restaurantCommission;
    statsByRestaurant.set(key, stats);
  }

  return {
    range: { from, to, groupBy, days: dayCount },
    summary: {
      ...totals,
      commission: totals.restaurantCommission + totals.shipperCommission,
      inProgressOrders: totals.totalOrders - totals.deliveredOrders - totals.cancelledOrders,
      averageOrderValue: totals.deliveredOrders ? Math.round(totals.gmv / totals.deliveredOrders) : 0,
      cancelRate: totals.totalOrders ? Math.round((totals.cancelledOrders / totals.totalOrders) * 1000) / 10 : 0,
      complaintRefunds: complaints.refundAmount,
    },
    series: [...series.values()],
    topRestaurants: await loadTopRestaurants(statsByRestaurant),
    reviews,
    complaints,
    deliveryIssues,
    hasCommissionRules: rules.length > 0,
  };
};
