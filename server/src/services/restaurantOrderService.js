import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import { startOfTodayInVietnam } from '../utils/date.js';
import { maskPhone } from '../utils/maskPhone.js';
import { legacyCancellationFromCanonical, legacyPaymentFromCanonical } from '../utils/orderFieldSync.js';
import { recordStatusChange } from './orderHistoryService.js';
import {
  PAYMENT_ALLOWS_FULFILLMENT_FILTER,
  VISIBLE_TO_RESTAURANT_FILTER,
  refundRequestFields,
  waitingSince,
} from './orderPolicy.js';
import { getOrderTimeouts } from './settingService.js';
import { REGULAR_CUSTOMER_MIN_ORDERS, REGULAR_CUSTOMER_WINDOW_DAYS } from './orderTiming.js';
import { sendRealtimeNotification, broadcastRealtimeNotification } from '../socket.js';

// confirmed = accepted, waiting for a shipper; the kitchen cooks once a shipper takes it (docs/order-flow.md)
const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup'];
const RECENT_CANCEL_WINDOW_MS = 10 * 60 * 1000; // customer-cancelled orders stay visible 10 minutes
const STATUS_LABELS = {
  pending: 'chờ nhận',
  confirmed: 'đang tìm shipper',
  preparing: 'đang chuẩn bị',
  ready_for_pickup: 'sẵn sàng lấy hàng',
  delivering: 'đang giao',
  delivered: 'đã giao',
  cancelled: 'đã hủy',
};

const REJECT_REASON_LABELS = {
  out_of_stock: 'Hết món / hết nguyên liệu',
  too_busy: 'Quán đang quá tải',
  closing_soon: 'Quán sắp đóng cửa',
  other: 'Lý do khác',
};

/**
 * What the kitchen may see of an order: an explicit whitelist, so a field added to the model later
 * (or a legacy copy such as deliveryAddress.phone) never leaks. The phone is always masked; the address
 * stays because the restaurant hands the bag over with it.
 */
const toRestaurantView = (order) => ({
  _id: order._id,
  orderCode: order.orderCode || order.orderNumber,
  status: order.status,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  items: order.items,
  subtotal: order.subtotal,
  packagingFee: order.packagingFee,
  shippingFee: order.shippingFee,
  discount: order.discount,
  // The restaurant's own voucher (it pays it); the rest of "discount" is the platform's
  restaurantVoucher: { code: order.restaurantVoucher?.code || null, discountAmount: order.restaurantVoucher?.discountAmount || 0 },
  total: order.total,
  customerNote: order.customerNote,
  delivery: {
    recipientName: order.delivery?.recipientName || '',
    phone: maskPhone(order.delivery?.phone || ''),
    address: order.delivery?.address || '',
    type: order.delivery?.type,
    expectedAt: order.delivery?.expectedAt || null,
  },
  payment: {
    method: order.payment?.method,
    status: order.payment?.status,
    paidAt: order.payment?.paidAt || null,
    refundedAt: order.payment?.refundedAt || null,
    refundAmount: order.payment?.refundAmount || 0,
  },
  refund: { status: order.refund?.status || 'none', amount: order.refund?.amount || 0 },
  statusHistory: order.statusHistory,
  acceptedAt: order.acceptedAt,
  // The kitchen starts when a shipper takes the order (older orders: when the restaurant accepted)
  cookingStartedAt: order.statusHistory?.findLast((entry) => entry.status === 'preparing')?.at || order.acceptedAt,
  readyAt: order.readyAt,
  kitchenTicketNo: order.kitchenTicketNo,
  kitchenDueAt: order.kitchenDueAt,
  cancellation: order.cancellation,
  // Populated on board / detail reads ({ _id, fullName }), a plain id after a status change
  shipper: order.shipper ? { _id: order.shipper._id ?? order.shipper, fullName: order.shipper.fullName || '' } : null,
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

  // TO-02 / TO-03: the board shows when a waiting order is reminded and when it cancels itself
  const { acceptRemind, acceptTimeout, shipperTimeout } = await getOrderTimeouts();
  const withAcceptDeadlines = (order) => {
    const since = waitingSince(order).getTime();
    return {
      ...toRestaurantView(order),
      waitingSince: new Date(since),
      acceptRemindAt: new Date(since + acceptRemind * 60 * 1000),
      acceptDeadline: new Date(since + acceptTimeout * 60 * 1000),
    };
  };

  // TO-07: a confirmed order cancels itself when no shipper takes it in time (nothing cooked yet)
  const withShipperDeadline = (order) => {
    const since = new Date(order.timeouts?.releasedAt || order.acceptedAt || order.createdAt).getTime();
    return {
      ...toRestaurantView(order),
      waitingShipperSince: new Date(since),
      shipperDeadline: new Date(since + shipperTimeout * 60 * 1000),
    };
  };

  return {
    pending: activeOrders.filter((order) => order.status === 'pending').map(withAcceptDeadlines),
    confirmed: activeOrders.filter((order) => order.status === 'confirmed').map(withShipperDeadline),
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
  if (order) return order.toObject(); // callers notify the customer, then answer with toRestaurantView

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

// Yes: the restaurant confirms it will make the order. The kitchen does not cook yet: the order is shown to
// shippers and cooking starts when one of them takes it (shipperOrderService.acceptOrder).
// COD orders are accepted unpaid; online orders only when already paid.
export const acceptOrder = async (restaurantId, orderId) => {
  const now = new Date();
  const accepted = await transitionOrder({
    restaurantId,
    orderId,
    fromStatus: 'pending',
    conditions: PAYMENT_ALLOWS_FULFILLMENT_FILTER,
    conditionError: 'Thanh toán của đơn không hợp lệ, không thể nhận đơn',
    update: {
      $set: { status: 'confirmed', acceptedAt: now },
      $push: historyEntry('confirmed', now),
    },
  });

  await recordStatusChange({
    orderId: accepted._id,
    fromStatus: 'pending',
    toStatus: 'confirmed',
    role: 'restaurant',
    action: 'Quán đã nhận đơn',
    note: 'Đang tìm shipper. Bếp bắt đầu nấu khi có shipper nhận đơn',
  });

  if (accepted.customer) {
    sendRealtimeNotification(accepted.customer, {
      title: 'Quán đã nhận đơn! 🧾',
      message: `Đơn #${accepted.orderCode || accepted.orderNumber || ''} đã được quán xác nhận. Hệ thống đang tìm shipper, bếp sẽ nấu ngay khi có shipper nhận.`,
      type: 'order',
      orderId: accepted._id,
      link: `/orders/${accepted._id}`,
    });
  }

  broadcastRealtimeNotification('shipper', 'new_pickup_order', {
    orderId: accepted._id,
    orderCode: accepted.orderCode || accepted.orderNumber,
  });

  return toRestaurantView(accepted);
};

// No: cancel. A customer who already paid online gets a refund request (completed by an admin)
export const rejectOrder = async (restaurantId, orderId, { reason, note }) => {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId, ...VISIBLE_TO_RESTAURANT_FILTER })
    .select('status payment total customer')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  const now = new Date();
  const isPaid = order.payment.status === 'paid';
  // Paid: payment stays "paid" and a refund is owed. Unpaid: nothing to give back.
  const paymentUpdate = isPaid ? refundRequestFields(order.total, now) : { 'payment.status': 'cancelled' };
  const cancellation = { by: 'restaurant', reason, note, at: now };
  // findOneAndUpdate skips the model hook: also update the legacy fields read by the customer screens
  const legacyUpdate = {
    ...legacyPaymentFromCanonical(
      { method: order.payment.method, status: isPaid ? 'paid' : 'cancelled', refundAmount: 0 },
      isPaid ? { status: 'pending', amount: order.total } : null,
    ),
    ...legacyCancellationFromCanonical(cancellation),
  };

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
        cancellation,
        ...paymentUpdate,
        ...legacyUpdate,
      },
      $push: historyEntry('cancelled', now),
    },
  });

  const reasonLabel = REJECT_REASON_LABELS[reason] || 'Quán quá tải';
  await recordStatusChange({
    orderId: rejected._id,
    fromStatus: 'pending',
    toStatus: 'cancelled',
    role: 'restaurant',
    action: isPaid ? 'Quán từ chối đơn - chờ hoàn tiền' : 'Quán từ chối đơn',
    note: [reasonLabel, note, isPaid && `Sẽ hoàn ${order.total.toLocaleString('vi-VN')}đ`].filter(Boolean).join(' · '),
  });

  if (order.customer) {
    sendRealtimeNotification(order.customer, {
      title: 'Quán ăn đã từ chối đơn hàng ❌',
      message: `Đơn hàng của bạn không thể thực hiện (${reasonLabel}).${isPaid ? ' Yêu cầu hoàn tiền đã được tạo, bạn sẽ nhận thông báo khi tiền được chuyển trả.' : ''}`,
      type: 'order',
      orderId,
      link: `/orders/${orderId}`,
    });
  }

  return toRestaurantView(rejected);
};

// Kitchen done: the shipper who took the order can pick it up (payment must still be valid)
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

  await recordStatusChange({
    orderId: ready._id,
    fromStatus: 'preparing',
    toStatus: 'ready_for_pickup',
    role: 'restaurant',
    action: 'Món đã sẵn sàng',
    note: 'Bếp đã chuẩn bị xong, đang chờ shipper tới lấy hàng',
  });

  if (ready.customer) {
    sendRealtimeNotification(ready.customer, {
      title: 'Món ăn đã chuẩn bị xong! 🥡',
      message: `Món ăn của bạn đã nấu xong. Hệ thống đang điều phối shipper tới lấy hàng!`,
      type: 'order',
      orderId: ready._id,
      link: `/orders/${ready._id}`,
    });
  }

  // Normally a shipper already holds the order; one given back to the pool is announced again
  if (!ready.shipper) {
    broadcastRealtimeNotification('shipper', 'new_pickup_order', {
      orderId: ready._id,
      orderCode: ready.orderCode || ready.orderNumber,
    });
  }

  return toRestaurantView(ready);
};
