import CommissionRule from '../models/CommissionRule.js';
import Complaint from '../models/Complaint.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import { addDays, startOfVietnamDay, vietnamDateString } from '../utils/date.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { maskPhone } from '../utils/maskPhone.js';
import { toPage } from '../utils/pagination.js';
import { resolveRate } from './commissionRuleService.js';
import { VISIBLE_TO_RESTAURANT_FILTER } from './orderPolicy.js';

/**
 * Revenue report of the owner's restaurant. Same rules as the admin report (UC44) so both show the same numbers:
 * - orders belong to the Vietnam day they were placed; online orders never paid are not orders
 * - revenue and commission only count delivered orders
 * - platform fee = round(subtotal x commission rate of that day); packaging and shipping fees are not commissioned
 * - platform vouchers are paid by the platform: the restaurant still receives the full subtotal
 * See docs/restaurant-report.md.
 */

const MAX_DAILY_POINTS = 62; // longer ranges are grouped by month, like the admin chart
const TOP_DISH_COUNT = 5;
const RECENT_ORDER_COUNT = 5;
const PEAK_WINDOW_HOURS = 2;
const PEAK_WINDOW_COUNT = 2;
const EXPORT_LIMIT = 5000;
const VIETNAM_TIMEZONE = '+07:00';
const IN_PROGRESS_STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'delivering'];

// Order history tabs: a restaurant rejection is the restaurant's fault, any other cancel is not
const TAB_FILTERS = {
  all: {},
  delivered: { status: 'delivered' },
  in_progress: { status: { $in: IN_PROGRESS_STATUSES } },
  cancelled: { status: 'cancelled', 'cancellation.by': { $ne: 'restaurant' } },
  rejected: { status: 'cancelled', 'cancellation.by': 'restaurant' },
};

const percentOf = (amount, rate) => Math.round((amount * rate) / 100);
const share = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const roundRating = (value) => (value ? Math.round(value * 10) / 10 : 0);

const vietnamDay = (path) => ({ $dateToString: { format: '%Y-%m-%d', date: path, timezone: VIETNAM_TIMEZONE } });
const createdBetween = (from, to) => ({ $gte: startOfVietnamDay(from), $lt: startOfVietnamDay(addDays(to, 1)) });

const countDays = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / (24 * 60 * 60 * 1000)) + 1;

// Topping = option prices x quantity; the rest of the subtotal is the dishes themselves
const TOPPINGS_EXPR = {
  $sum: {
    $map: {
      input: '$items',
      as: 'item',
      in: { $multiply: [{ $sum: '$$item.options.price' }, '$$item.quantity'] },
    },
  },
};

const tabOf = (status, cancelledBy) => {
  if (status === 'delivered') return 'delivered';
  if (status !== 'cancelled') return 'in_progress';
  return cancelledBy === 'restaurant' ? 'rejected' : 'cancelled';
};

// Only the rules that can apply to this restaurant (its own + the default one)
const loadCommissionRules = (restaurantId) =>
  CommissionRule.find({ target: 'restaurant', $or: [{ restaurant: null }, { restaurant: restaurantId }] }).lean();

// ---------- Weekly settlement (simulated, no payment gateway): Monday-Sunday, paid the next Monday

const dayOfWeek = (day) => new Date(`${day}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday

export const getSettlementCycle = (day, today = vietnamDateString()) => {
  const from = addDays(day, -((dayOfWeek(day) + 6) % 7));
  const payoutDate = addDays(from, 7);
  return { from, to: addDays(from, 6), payoutDate, status: today >= payoutDate ? 'settled' : 'pending' };
};

// "0123456789" -> "**** 6789": enough for the owner to recognise the account on screen and on paper
const maskAccountNumber = (accountNumber = '') => (accountNumber ? `**** ${accountNumber.slice(-4)}` : '');

const toPayoutAccountView = (payoutAccount = {}) => ({
  isSet: Boolean(payoutAccount.accountNumber),
  bankName: payoutAccount.bankName || '',
  accountNumber: maskAccountNumber(payoutAccount.accountNumber),
  accountHolder: payoutAccount.accountHolder || '',
});

// ---------- Daily figures (the base of every number in the report)

const emptyDay = (day) => ({
  day,
  totalOrders: 0,
  delivered: 0,
  in_progress: 0,
  cancelled: 0,
  rejected: 0,
  subtotal: 0,
  toppingRevenue: 0,
  packagingFee: 0,
  rate: 0,
  platformFee: 0,
});

const loadDailyStats = async (restaurantId, from, to, rules) => {
  const groups = await Order.aggregate([
    { $match: { restaurant: restaurantId, createdAt: createdBetween(from, to), ...VISIBLE_TO_RESTAURANT_FILTER } },
    {
      $group: {
        _id: { day: vietnamDay('$createdAt'), status: '$status', cancelledBy: '$cancellation.by' },
        orders: { $sum: 1 },
        subtotal: { $sum: '$subtotal' },
        toppingRevenue: { $sum: TOPPINGS_EXPR },
        packagingFee: { $sum: '$packagingFee' },
      },
    },
  ]);

  const days = new Map();
  for (const group of groups) {
    const { day, status, cancelledBy } = group._id;
    const stats = days.get(day) || emptyDay(day);
    stats.totalOrders += group.orders;
    stats[tabOf(status, cancelledBy)] += group.orders;
    if (status === 'delivered') {
      stats.subtotal += group.subtotal;
      stats.toppingRevenue += group.toppingRevenue;
      stats.packagingFee += group.packagingFee || 0;
    }
    days.set(day, stats);
  }
  // Rounded once per day, exactly like the admin report (one group per day and restaurant)
  for (const stats of days.values()) {
    stats.rate = resolveRate(rules, 'restaurant', restaurantId, stats.day);
    stats.platformFee = percentOf(stats.subtotal, stats.rate);
  }
  return days;
};

// Money of one day (or a sum of days) as shown to the owner
const toMoney = (stats) => {
  const grossRevenue = stats.subtotal + stats.packagingFee;
  const restaurantVoucher = 0; // vouchers are platform-funded for now (PromotionRule has no restaurant)
  return {
    foodRevenue: stats.subtotal - stats.toppingRevenue,
    toppingRevenue: stats.toppingRevenue,
    packagingFee: stats.packagingFee,
    grossRevenue,
    platformFee: stats.platformFee,
    restaurantVoucher,
    netRevenue: grossRevenue - stats.platformFee - restaurantVoucher,
  };
};

const sumDays = (days) => {
  const total = emptyDay(null);
  for (const stats of days) {
    for (const key of ['totalOrders', 'delivered', 'in_progress', 'cancelled', 'rejected', 'subtotal', 'toppingRevenue', 'packagingFee', 'platformFee']) {
      total[key] += stats[key];
    }
  }
  return total;
};

const summarize = (days) => {
  const total = sumDays(days);
  const money = toMoney(total);
  return {
    ...money,
    totalOrders: total.totalOrders,
    deliveredOrders: total.delivered,
    inProgressOrders: total.in_progress,
    cancelledOrders: total.cancelled,
    rejectedOrders: total.rejected,
    averageOrderValue: total.delivered ? Math.round(money.grossRevenue / total.delivered) : 0,
    completionRate: share(total.delivered, total.totalOrders),
    rejectRate: share(total.rejected, total.totalOrders),
    // Weighted over the period: the rate may change in the middle of it
    commissionRate: share(total.platformFee, total.subtotal),
  };
};

const buildSeries = (from, to, dailyStats) => {
  const groupBy = countDays(from, to) > MAX_DAILY_POINTS ? 'month' : 'day';
  const points = new Map();
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const key = groupBy === 'day' ? day : day.slice(0, 7);
    const point = points.get(key) || { key, days: [] };
    if (dailyStats.has(day)) point.days.push(dailyStats.get(day));
    points.set(key, point);
  }
  const series = [...points.values()].map(({ key, days }) => {
    const total = sumDays(days);
    return { key, deliveredOrders: total.delivered, ...toMoney(total) };
  });
  return { groupBy, series };
};

// ---------- Overview parts

// Delivered orders per Vietnam hour + the busiest non-overlapping 2-hour windows
const loadPeakHours = async (match) => {
  const groups = await Order.aggregate([
    { $match: { ...match, status: 'delivered' } },
    {
      $group: {
        _id: { $hour: { date: '$createdAt', timezone: VIETNAM_TIMEZONE } },
        orders: { $sum: 1 },
        revenue: { $sum: { $add: ['$subtotal', { $ifNull: ['$packagingFee', 0] }] } },
      },
    },
  ]);
  const hours = Array.from({ length: 24 }, (_, hour) => {
    const group = groups.find((item) => item._id === hour);
    return { hour, orders: group?.orders || 0, revenue: group?.revenue || 0 };
  });
  const totalOrders = hours.reduce((sum, item) => sum + item.orders, 0);

  const windows = hours
    .slice(0, 24 - PEAK_WINDOW_HOURS + 1)
    .map((_, start) => ({
      start,
      orders: hours.slice(start, start + PEAK_WINDOW_HOURS).reduce((sum, item) => sum + item.orders, 0),
    }))
    .filter((window) => window.orders > 0)
    .sort((a, b) => b.orders - a.orders || a.start - b.start);
  const busiest = [];
  for (const window of windows) {
    if (busiest.length === PEAK_WINDOW_COUNT) break;
    if (busiest.some((picked) => Math.abs(picked.start - window.start) < PEAK_WINDOW_HOURS)) continue;
    busiest.push(window);
  }
  return {
    hours,
    busiest: busiest
      .sort((a, b) => a.start - b.start)
      .map(({ start, orders }) => ({ fromHour: start, toHour: start + PEAK_WINDOW_HOURS, orders, share: share(orders, totalOrders) })),
  };
};

// Line revenue: kitchen orders store lineTotal, old checkout orders only price x quantity
const LINE_REVENUE_EXPR = {
  $cond: [
    { $gt: ['$items.lineTotal', 0] },
    '$items.lineTotal',
    { $multiply: [{ $max: ['$items.unitPrice', '$items.price'] }, '$items.quantity'] },
  ],
};

const loadTopDishes = async (match, limit = TOP_DISH_COUNT) => {
  const groups = await Order.aggregate([
    { $match: { ...match, status: 'delivered' } },
    { $unwind: '$items' },
    {
      $group: {
        // Same dish even if renamed later; deleted dishes fall back to their name
        _id: { $ifNull: ['$items.menuItem', { $ifNull: ['$items.food', '$items.name'] }] },
        name: { $last: '$items.name' },
        image: { $last: '$items.image' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: LINE_REVENUE_EXPR },
      },
    },
    { $sort: { quantity: -1, revenue: -1 } },
    {
      $facet: {
        top: [{ $limit: limit }],
        totals: [{ $group: { _id: null, quantity: { $sum: '$quantity' }, revenue: { $sum: '$revenue' } } }],
      },
    },
  ]);
  const { top, totals } = groups[0];
  const totalQuantity = totals[0]?.quantity || 0;
  return top.map((dish) => ({
    _id: dish._id,
    name: dish.name,
    image: dish.image || '',
    quantity: dish.quantity,
    revenue: dish.revenue,
    share: share(dish.quantity, totalQuantity),
  }));
};

const summarizeReviews = async (restaurantId, from, to) => {
  const [result] = await Review.aggregate([
    { $match: { restaurant: restaurantId, createdAt: createdBetween(from, to) } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              hidden: { $sum: { $cond: ['$isHidden', 1, 0] } },
              visible: { $sum: { $cond: ['$isHidden', 0, 1] } },
              withComment: { $sum: { $cond: [{ $and: [{ $not: ['$isHidden'] }, { $gt: [{ $strLenCP: '$comment' }, 0] }] }, 1, 0] } },
              // Hidden reviews never count, same as the public rating
              average: { $avg: { $cond: ['$isHidden', null, '$restaurantRating'] } },
            },
          },
        ],
        distribution: [{ $match: { isHidden: false } }, { $group: { _id: '$restaurantRating', count: { $sum: 1 } } }],
      },
    },
  ]);
  const totals = result.totals[0] || {};
  const total = totals.visible || 0;
  return {
    total,
    hidden: totals.hidden || 0,
    withComment: totals.withComment || 0,
    average: roundRating(totals.average),
    distribution: [5, 4, 3, 2, 1].map((stars) => {
      const count = result.distribution.find((group) => group._id === stars)?.count || 0;
      return { stars, count, share: share(count, total) };
    }),
  };
};

// Complaint refunds are paid by the platform: shown for information, never deducted from the payout
const summarizeComplaints = async (restaurantId, from, to) => {
  const [result] = await Complaint.aggregate([
    { $match: { restaurant: restaurantId, createdAt: createdBetween(from, to) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        refundAmount: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, '$resolution.refundAmount', 0] } },
      },
    },
  ]);
  return {
    total: result?.total || 0,
    open: result?.open || 0,
    resolved: result?.resolved || 0,
    refundAmount: result?.refundAmount || 0,
  };
};

// ---------- Order rows

const deliveredAtOf = (order) =>
  [...(order.statusHistory || [])].reverse().find((entry) => entry.status === 'delivered')?.at || null;

const toOrderRow = (order, rules, restaurantId) => {
  const tab = tabOf(order.status, order.cancellation?.by);
  const packagingFee = order.packagingFee || 0;
  const isDelivered = order.status === 'delivered';
  const day = vietnamDateString(order.createdAt);
  const rate = isDelivered ? resolveRate(rules, 'restaurant', restaurantId, day) : 0;
  // Per order the fee is an estimate: the settlement rounds once per day
  const platformFee = isDelivered ? percentOf(order.subtotal, rate) : 0;
  const recipient = order.delivery?.recipientName || order.deliveryAddress?.recipientName || '';
  const phone = order.delivery?.phone || order.deliveryAddress?.phone || '';
  return {
    _id: order._id,
    orderCode: order.orderCode || order.orderNumber,
    createdAt: order.createdAt,
    deliveredAt: isDelivered ? deliveredAtOf(order) : null,
    status: order.status,
    tab,
    customerName: recipient,
    customerPhone: maskPhone(phone),
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: order.subtotal,
    packagingFee,
    grossRevenue: order.subtotal + packagingFee,
    commissionRate: rate,
    platformFee,
    netRevenue: isDelivered ? order.subtotal + packagingFee - platformFee : 0,
    payment: { method: order.payment?.method, status: order.payment?.status },
    cancellation: order.status === 'cancelled' ? { by: order.cancellation?.by || null, reason: order.cancellation?.reason || '' } : null,
  };
};

const ORDER_ROW_FIELDS =
  'orderCode orderNumber createdAt status statusHistory delivery.recipientName delivery.phone deliveryAddress.recipientName deliveryAddress.phone items.name items.quantity subtotal packagingFee payment.method payment.status cancellation.by cancellation.reason';

const buildOrderFilter = (restaurantId, { from, to, status, keyword }) => {
  const filter = { restaurant: restaurantId, createdAt: createdBetween(from, to), ...VISIBLE_TO_RESTAURANT_FILTER };
  if (keyword) {
    const pattern = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [
      { orderCode: pattern },
      { orderNumber: pattern },
      { 'delivery.recipientName': pattern },
      { 'deliveryAddress.recipientName': pattern },
    ];
  }
  // TAB_FILTERS never use $or, so the keyword search above is kept
  return { ...filter, ...TAB_FILTERS[status] };
};

// ---------- Public API

export const getOverview = async (restaurant, { from, to }) => {
  const restaurantId = restaurant._id;
  const days = countDays(from, to);
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(from, -days);
  const today = vietnamDateString();
  const cycle = getSettlementCycle(today, today);
  const match = { restaurant: restaurantId, createdAt: createdBetween(from, to), ...VISIBLE_TO_RESTAURANT_FILTER };

  const rules = await loadCommissionRules(restaurantId);
  const [dailyStats, previousStats, cycleStats, peakHours, topDishes, recentOrders, reviews, complaints] = await Promise.all([
    loadDailyStats(restaurantId, from, to, rules),
    loadDailyStats(restaurantId, previousFrom, previousTo, rules),
    loadDailyStats(restaurantId, cycle.from, today, rules),
    loadPeakHours(match),
    loadTopDishes(match),
    Order.find(match).select(ORDER_ROW_FIELDS).sort({ createdAt: -1 }).limit(RECENT_ORDER_COUNT).lean(),
    summarizeReviews(restaurantId, from, to),
    summarizeComplaints(restaurantId, from, to),
  ]);

  const previous = summarize([...previousStats.values()]);
  const currentCycle = summarize([...cycleStats.values()]);
  return {
    range: { from, to, days, previousFrom, previousTo, ...buildSeries(from, to, dailyStats) },
    summary: summarize([...dailyStats.values()]),
    previous: {
      grossRevenue: previous.grossRevenue,
      netRevenue: previous.netRevenue,
      deliveredOrders: previous.deliveredOrders,
      averageOrderValue: previous.averageOrderValue,
      completionRate: previous.completionRate,
    },
    peakHours,
    topDishes,
    recentOrders: recentOrders.map((order) => toOrderRow(order, rules, restaurantId)),
    reviews: { ...reviews, overallRating: restaurant.rating || 0, overallCount: restaurant.ratingCount || 0 },
    complaints,
    currentCycle: { ...cycle, deliveredOrders: currentCycle.deliveredOrders, netRevenue: currentCycle.netRevenue },
    payoutAccount: toPayoutAccountView(restaurant.payoutAccount),
    hasCommissionRules: rules.length > 0,
  };
};

export const listOrders = async (restaurant, { from, to, status, keyword, page, limit }) => {
  const restaurantId = restaurant._id;
  const filter = buildOrderFilter(restaurantId, { from, to, status, keyword });
  const tabFilter = buildOrderFilter(restaurantId, { from, to, status: 'all', keyword });

  const [rules, orders, totalItems, tabGroups] = await Promise.all([
    loadCommissionRules(restaurantId),
    Order.find(filter).select(ORDER_ROW_FIELDS).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
    Order.aggregate([
      { $match: tabFilter },
      { $group: { _id: { status: '$status', cancelledBy: '$cancellation.by' }, count: { $sum: 1 } } },
    ]),
  ]);

  const counts = { all: 0, delivered: 0, in_progress: 0, cancelled: 0, rejected: 0 };
  for (const group of tabGroups) {
    counts.all += group.count;
    counts[tabOf(group._id.status, group._id.cancelledBy)] += group.count;
  }
  return {
    ...toPage(orders.map((order) => toOrderRow(order, rules, restaurantId)), { page, limit }, totalItems),
    counts,
  };
};

// Every row of the filter for the CSV file (capped so one request cannot load years of orders)
export const exportOrders = async (restaurant, { from, to, status, keyword }) => {
  const restaurantId = restaurant._id;
  const filter = buildOrderFilter(restaurantId, { from, to, status, keyword });
  const [rules, orders] = await Promise.all([
    loadCommissionRules(restaurantId),
    Order.find(filter).select(ORDER_ROW_FIELDS).sort({ createdAt: -1 }).limit(EXPORT_LIMIT + 1).lean(),
  ]);
  return {
    items: orders.slice(0, EXPORT_LIMIT).map((order) => toOrderRow(order, rules, restaurantId)),
    truncated: orders.length > EXPORT_LIMIT,
    limit: EXPORT_LIMIT,
  };
};

// "Nguyễn Văn Tuấn" -> "Tuấn N.": enough to recognise a regular, not enough to identify a stranger
const shortenName = (fullName = '') => {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Khách hàng';
  if (words.length === 1) return words[0];
  return `${words[words.length - 1]} ${words[0].charAt(0).toUpperCase()}.`;
};

export const listReviews = async (restaurant, { from, to, rating, page, limit }) => {
  const restaurantId = restaurant._id;
  const filter = { restaurant: restaurantId, isHidden: false, createdAt: createdBetween(from, to) };
  if (rating) filter.restaurantRating = rating;

  const [reviews, totalItems, summary] = await Promise.all([
    Review.find(filter)
      .select('order orderCode customer restaurantRating comment createdAt')
      .populate('customer', 'fullName avatar')
      .populate('order', 'items.name items.quantity')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    summarizeReviews(restaurantId, from, to),
  ]);

  const items = reviews.map((review) => ({
    _id: review._id,
    orderCode: review.orderCode,
    customerName: shortenName(review.customer?.fullName),
    customerAvatar: review.customer?.avatar || '',
    rating: review.restaurantRating,
    comment: review.comment,
    items: (review.order?.items || []).map((item) => ({ name: item.name, quantity: item.quantity })),
    createdAt: review.createdAt,
  }));
  return {
    ...toPage(items, { page, limit }, totalItems),
    summary: { ...summary, overallRating: restaurant.rating || 0, overallCount: restaurant.ratingCount || 0 },
  };
};

export const getSettlements = async (restaurant, { from, to }) => {
  const restaurantId = restaurant._id;
  const today = vietnamDateString();
  const rules = await loadCommissionRules(restaurantId);
  const dailyStats = await loadDailyStats(restaurantId, from, to, rules);

  // Only days with delivered orders have money to settle; newest first like a bank statement
  const settledDays = [...dailyStats.values()].filter((stats) => stats.delivered > 0).sort((a, b) => b.day.localeCompare(a.day));
  const days = settledDays.map((stats) => {
    const cycle = getSettlementCycle(stats.day, today);
    return {
      day: stats.day,
      deliveredOrders: stats.delivered,
      subtotal: stats.subtotal,
      commissionRate: stats.rate,
      ...toMoney(stats),
      cycle: { from: cycle.from, to: cycle.to, payoutDate: cycle.payoutDate },
      status: cycle.status,
    };
  });

  const cycles = new Map();
  for (const stats of settledDays) {
    const cycle = getSettlementCycle(stats.day, today);
    const entry = cycles.get(cycle.from) || { ...cycle, days: [] };
    entry.days.push(stats);
    cycles.set(cycle.from, entry);
  }

  const totals = summarize(settledDays);
  const amountByStatus = (status) => days.filter((day) => day.status === status).reduce((sum, day) => sum + day.netRevenue, 0);
  return {
    range: { from, to },
    payoutAccount: toPayoutAccountView(restaurant.payoutAccount),
    totals: {
      deliveredOrders: totals.deliveredOrders,
      grossRevenue: totals.grossRevenue,
      platformFee: totals.platformFee,
      restaurantVoucher: totals.restaurantVoucher,
      packagingFee: totals.packagingFee,
      netRevenue: totals.netRevenue,
      commissionRate: totals.commissionRate,
      settledAmount: amountByStatus('settled'),
      pendingAmount: amountByStatus('pending'),
    },
    cycles: [...cycles.values()].map(({ days: cycleDays, ...cycle }) => {
      const cycleTotals = summarize(cycleDays);
      return {
        ...cycle,
        // The cycle starts or ends outside the chosen range: its total here is only part of the transfer
        isPartial: cycle.from < from || cycle.to > to,
        deliveredOrders: cycleTotals.deliveredOrders,
        grossRevenue: cycleTotals.grossRevenue,
        platformFee: cycleTotals.platformFee,
        netRevenue: cycleTotals.netRevenue,
      };
    }),
    days,
    hasCommissionRules: rules.length > 0,
  };
};
