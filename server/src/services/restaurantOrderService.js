import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import { startOfTodayInVietnam } from '../utils/date.js';
import { maskPhone } from '../utils/maskPhone.js';
import { getNextKitchenTicketNo } from './counterService.js';
import { PAYMENT_ALLOWS_FULFILLMENT_FILTER, VISIBLE_TO_RESTAURANT_FILTER } from './orderPolicy.js';
import {
  REGULAR_CUSTOMER_MIN_ORDERS,
  REGULAR_CUSTOMER_WINDOW_DAYS,
  calculateKitchenDueAt,
} from './orderTiming.js';
import { sendRealtimeNotification, broadcastRealtimeNotification } from '../socket.js';

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

// Only a count + flag leave the server: the restaurant learns nothing else about the customer
const getCustomerInsight = async (restaurantId, customerId) => {
  const since = new Date(Date.now() - REGULAR_CUSTOMER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const completedOrders = await Order.countDocuments({
    restaurant: restaurantId,
    customer: customerId,
    status: 'delivered',
    createdAt: { $gte: since },
  });
  return { completedOrders, isRegular: completedOrders >= REGULAR_CUSTOMER_MIN_ORDERS };
};

export const getOrderDetail = async (restaurantId, orderId) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, ...VISIBLE_TO_RESTAURANT_FILTER })
    .populate('shipper', 'fullName')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  const customerInsight = await getCustomerInsight(restaurantId, order.customer);
  return { ...toRestaurantView(order), customerInsight };
};

// "GN-0042" -> order id, any status, only within the owner's restaurant
export const findOrderIdByCode = async (restaurantId, orderCode) => {
  const order = await Order.findOne({ orderCode, restaurant: restaurantId, ...VISIBLE_TO_RESTAURANT_FILTER })
    .select('_id')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  return { _id: order._id };
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
  const pending = await Order.findOne({ _id: orderId, restaurant: restaurantId }).select('delivery.type').lean();
  const kitchenDueAt = calculateKitchenDueAt(now, pending?.delivery.type);

  const accepted = await transitionOrder({
    restaurantId,
    orderId,
    fromStatus: 'pending',
    conditions: PAYMENT_ALLOWS_FULFILLMENT_FILTER,
    conditionError: 'Thanh toán của đơn không hợp lệ, không thể nhận đơn',
    update: {
      $set: { status: 'preparing', acceptedAt: now, kitchenDueAt },
      $push: historyEntry('preparing', now),
    },
  });

  // Ticket number only after the accept really succeeded: a request that loses the race wastes no number
  const kitchenTicketNo = await getNextKitchenTicketNo(restaurantId, now);
  await Order.updateOne({ _id: accepted._id }, { $set: { kitchenTicketNo } });

  if (accepted?.customer) {
    sendRealtimeNotification(accepted.customer, {
      title: 'Quán đã nhận đơn & đang nấu! 🍳',
      message: `Đơn #${accepted.orderCode || accepted.orderNumber || ''} đã được bếp xác nhận và bắt đầu chế biến.`,
      type: 'order',
      orderId: accepted._id,
      link: `/orders/${accepted._id}`,
    });
  }

  return { ...accepted, kitchenTicketNo };
};

// No: cancel and refund if the customer already paid online (simulated, no payment gateway yet)
export const rejectOrder = async (restaurantId, orderId, { reason, note }) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, ...VISIBLE_TO_RESTAURANT_FILTER })
    .select('status payment total customer')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  const now = new Date();
  const isPaid = order.payment.status === 'paid';
  const paymentUpdate = isPaid
    ? { 'payment.status': 'refunded', 'payment.refundedAt': now, 'payment.refundAmount': order.total }
    : { 'payment.status': 'cancelled' };

  const rejected = await transitionOrder({
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

  if (order.customer) {
    sendRealtimeNotification(order.customer, {
      title: 'Quán ăn đã từ chối đơn hàng ❌',
      message: `Đơn hàng của bạn không thể thực hiện (${reason || 'Quán quá tải'}). Tiền sẽ được hoàn lại nếu đã thanh toán.`,
      type: 'order',
      orderId,
      link: `/orders/${orderId}`,
    });
  }

  return rejected;
};

// Kitchen done: the order becomes visible to shippers (payment must still be valid)
export const markReady = async (restaurantId, orderId) => {
  const now = new Date();
  const ready = await transitionOrder({
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

  if (ready?.customer) {
    sendRealtimeNotification(ready.customer, {
      title: 'Món ăn đã chuẩn bị xong! 🥡',
      message: `Món ăn của bạn đã nấu xong. Hệ thống đang điều phối shipper tới lấy hàng!`,
      type: 'order',
      orderId: ready._id,
      link: `/orders/${ready._id}`,
    });
  }

  broadcastRealtimeNotification('shipper', 'new_pickup_order', {
    orderId: ready._id,
    orderCode: ready.orderCode || ready.orderNumber,
  });

  return ready;
};
