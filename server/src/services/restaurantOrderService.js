import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import { startOfTodayInVietnam } from '../utils/date.js';
import { maskPhone } from '../utils/maskPhone.js';
import { PAYMENT_ALLOWS_FULFILLMENT_FILTER, VISIBLE_TO_RESTAURANT_FILTER } from './orderPolicy.js';

const ACTIVE_STATUSES = ['pending', 'preparing', 'ready_for_pickup'];
const RECENT_CANCEL_WINDOW_MS = 10 * 60 * 1000; // customer-cancelled orders stay visible 10 minutes
const STATUS_LABELS = {
  pending: 'chờ nhận',
  preparing: 'đang chuẩn bị',
  ready_for_pickup: 'sẵn sàng lấy hàng',
  delivering: 'đang giao',
  delivered: 'đã giao',
  cancelled: 'đã hủy',
};

// Restaurants never see the customer's full phone number
const toRestaurantView = (order) => ({
  ...order,
  delivery: { ...order.delivery, phone: maskPhone(order.delivery.phone) },
});

const findOrders = (filter, sort) =>
  Order.find(filter).populate('shipper', 'fullName').sort(sort).lean();

export const getBoard = async (restaurantId) => {
  const todayStart = startOfTodayInVietnam();
  // Online orders still waiting for payment are not real orders for the kitchen yet
  const ownOrders = { restaurant: restaurantId, ...VISIBLE_TO_RESTAURANT_FILTER };

  const [activeOrders, recentlyCancelled, todayOrders, completedToday] = await Promise.all([
    findOrders({ ...ownOrders, status: { $in: ACTIVE_STATUSES } }, { createdAt: 1 }), // oldest first
    findOrders(
      {
        ...ownOrders,
        status: 'cancelled',
        'cancellation.by': 'customer',
        'cancellation.at': { $gte: new Date(Date.now() - RECENT_CANCEL_WINDOW_MS) },
      },
      { 'cancellation.at': -1 },
    ),
    Order.countDocuments({ ...ownOrders, createdAt: { $gte: todayStart } }),
    // Kitchen finished today = became ready today and was not cancelled afterwards
    Order.countDocuments({ ...ownOrders, readyAt: { $gte: todayStart }, status: { $ne: 'cancelled' } }),
  ]);

  const byStatus = (status) => activeOrders.filter((order) => order.status === status).map(toRestaurantView);

  return {
    pending: byStatus('pending'),
    preparing: byStatus('preparing'),
    readyForPickup: byStatus('ready_for_pickup'),
    recentlyCancelled: recentlyCancelled.map(toRestaurantView),
    stats: {
      todayOrders,
      processing: activeOrders.length,
      completedToday,
    },
  };
};

export const getOrderDetail = async (restaurantId, orderId) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, ...VISIBLE_TO_RESTAURANT_FILTER })
    .populate('shipper', 'fullName')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  return toRestaurantView(order);
};

/**
 * Change status only if the order is still in `fromStatus` AND matches `conditions` (atomic).
 * If a customer cancels at the same moment the restaurant accepts, only one of them wins.
 * `conditionError`: message when the status is right but `conditions` (e.g. payment) are not met.
 */
const transitionOrder = async ({ restaurantId, orderId, fromStatus, conditions = {}, conditionError, update }) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, restaurant: restaurantId, status: fromStatus, ...VISIBLE_TO_RESTAURANT_FILTER, ...conditions },
    update,
    { returnDocument: 'after', runValidators: true },
  );
  if (order) return toRestaurantView(order.toObject());

  const current = await Order.findOne({ _id: orderId, restaurant: restaurantId, ...VISIBLE_TO_RESTAURANT_FILTER })
    .select('status')
    .lean();
  if (!current) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  if (current.status === fromStatus) {
    throw new ApiError(409, conditionError);
  }
  throw new ApiError(
    409,
    `Đơn hàng đang ở trạng thái "${STATUS_LABELS[current.status]}", vui lòng tải lại bảng đơn`,
  );
};

const historyEntry = (status, at) => ({ statusHistory: { status, at, byRole: 'restaurant' } });

// Yes: start cooking. COD orders are accepted unpaid; online orders only when already paid.
export const acceptOrder = async (restaurantId, orderId) => {
  const now = new Date();
  return transitionOrder({
    restaurantId,
    orderId,
    fromStatus: 'pending',
    conditions: PAYMENT_ALLOWS_FULFILLMENT_FILTER,
    conditionError: 'Thanh toán của đơn không hợp lệ, không thể nhận đơn',
    update: {
      $set: { status: 'preparing', acceptedAt: now },
      $push: historyEntry('preparing', now),
    },
  });
};

// No: cancel and refund if the customer already paid online (simulated, no payment gateway yet)
export const rejectOrder = async (restaurantId, orderId, { reason, note }) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, ...VISIBLE_TO_RESTAURANT_FILTER })
    .select('status payment total')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  const now = new Date();
  const isPaid = order.payment.status === 'paid';
  const paymentUpdate = isPaid
    ? { 'payment.status': 'refunded', 'payment.refundedAt': now, 'payment.refundAmount': order.total }
    : { 'payment.status': 'cancelled' };

  return transitionOrder({
    restaurantId,
    orderId,
    fromStatus: 'pending',
    // The refund is decided from the payment state we just read: it must not change in between
    conditions: { 'payment.status': order.payment.status },
    conditionError: 'Trạng thái thanh toán vừa thay đổi, vui lòng thử lại',
    update: {
      $set: {
        status: 'cancelled',
        cancellation: { by: 'restaurant', reason, note, at: now },
        ...paymentUpdate,
      },
      $push: historyEntry('cancelled', now),
    },
  });
};

// Kitchen done: the order becomes visible to shippers (payment must still be valid)
export const markReady = async (restaurantId, orderId) => {
  const now = new Date();
  return transitionOrder({
    restaurantId,
    orderId,
    fromStatus: 'preparing',
    conditions: PAYMENT_ALLOWS_FULFILLMENT_FILTER,
    conditionError: 'Thanh toán của đơn không hợp lệ, không thể giao cho shipper',
    update: {
      $set: { status: 'ready_for_pickup', readyAt: now },
      $push: historyEntry('ready_for_pickup', now),
    },
  });
};
