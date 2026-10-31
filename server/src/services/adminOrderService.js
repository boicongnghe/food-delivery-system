import Complaint from '../models/Complaint.js';
import DeliveryIssue from '../models/DeliveryIssue.js';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { addDays, startOfVietnamDay } from '../utils/date.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';
import { countByStatus } from './feedbackPolicy.js';
import { PLACED_ORDER_FILTER } from './orderPolicy.js';

// Platform order list for the admin (read only). Abandoned online checkouts are not orders.

// Tab -> order statuses (same tabs as ADMIN_ORDER_TABS of the query validation)
const TAB_STATUSES = {
  pending: ['pending'],
  preparing: ['confirmed', 'preparing'],
  ready_for_pickup: ['ready_for_pickup'],
  delivering: ['delivering'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
};

const LIST_FIELDS =
  'orderCode orderNumber customer restaurant shipper status total totalPrice payment.method payment.status ' +
  'delivery.recipientName items.quantity createdAt';

const buildBaseFilter = async ({ keyword, paymentMethod, from, to }) => {
  const filter = { ...PLACED_ORDER_FILTER };
  if (paymentMethod !== 'all') filter['payment.method'] = paymentMethod;
  if (from || to) {
    filter.createdAt = {
      ...(from && { $gte: startOfVietnamDay(from) }),
      ...(to && { $lt: startOfVietnamDay(addDays(to, 1)) }),
    };
  }
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    // The order code, the recipient, or the customer / restaurant / shipper behind the order
    const [userIds, restaurantIds] = await Promise.all([
      User.find({ $or: [{ fullName: regex }, { email: regex }, { phone: regex }] }).distinct('_id'),
      Restaurant.find({ name: regex }).distinct('_id'),
    ]);
    filter.$or = [
      { orderCode: regex },
      { orderNumber: regex },
      { 'delivery.recipientName': regex },
      { 'delivery.phone': regex },
      { customer: { $in: userIds } },
      { shipper: { $in: userIds } },
      { restaurant: { $in: restaurantIds } },
    ];
  }
  return filter;
};

export const listOrders = async ({ page, limit, status, ...filters }) => {
  const baseFilter = await buildBaseFilter(filters);
  const filter = status === 'all' ? baseFilter : { ...baseFilter, status: { $in: TAB_STATUSES[status] } };

  const [items, totalItems, statusCounts] = await Promise.all([
    Order.find(filter)
      .select(LIST_FIELDS)
      .populate('customer', 'fullName email')
      .populate('restaurant', 'name')
      .populate('shipper', 'fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
    countByStatus(Order, baseFilter, ORDER_STATUSES),
  ]);

  const counts = { all: statusCounts.all };
  for (const [tab, statuses] of Object.entries(TAB_STATUSES)) {
    counts[tab] = statuses.reduce((sum, orderStatus) => sum + statusCounts[orderStatus], 0);
  }
  return { ...toPage(items, { page, limit }, totalItems), counts };
};

export const getOrderDetail = async (orderId) => {
  const order = await Order.findOne({ _id: orderId, ...PLACED_ORDER_FILTER })
    .populate('customer', 'fullName email phone avatar isActive')
    .populate('restaurant', 'name phone address status logo')
    .populate('shipper', 'fullName phone avatar')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  // Feedback attached to the order, so the admin sees the whole story in one place
  const [complaint, review, deliveryIssues] = await Promise.all([
    Complaint.findOne({ order: order._id }).select('code category status resolution.refundAmount createdAt').lean(),
    Review.findOne({ order: order._id }).select('restaurantRating shipperRating comment isHidden createdAt').lean(),
    DeliveryIssue.find({ order: order._id }).select('code type status createdAt').sort({ createdAt: -1 }).lean(),
  ]);
  return { ...order, related: { complaint, review, deliveryIssues } };
};
