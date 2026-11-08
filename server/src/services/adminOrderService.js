import Complaint from '../models/Complaint.js';
import DeliveryIssue from '../models/DeliveryIssue.js';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Payment from '../models/Payment.js';
import Restaurant from '../models/Restaurant.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { addDays, startOfVietnamDay } from '../utils/date.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';
import { legacyPaymentFromCanonical } from '../utils/orderFieldSync.js';
import { sendRealtimeNotification } from '../socket.js';
import { countByStatus } from './feedbackPolicy.js';
import {
  NOT_PICKED_UP_STATUSES,
  SHIPPER_POOL_STATUSES,
  cancelAssignedOrder,
  releaseOrderToPool,
} from './orderAssignmentService.js';
import { cancelOrderBySystem } from './orderCancelService.js';
import { recordStatusChange } from './orderHistoryService.js';
import { PLACED_ORDER_FILTER } from './orderPolicy.js';
import { creditWalletRefund } from './walletService.js';

// Platform order list for the admin. Abandoned online checkouts are not orders.
// The only change an admin makes here is recording the result of a refund transfer.

// Tab -> order statuses (same tabs as ADMIN_ORDER_TABS of the query validation)
const TAB_STATUSES = {
  pending: ['pending'],
  confirmed: ['confirmed'],
  preparing: ['preparing'],
  ready_for_pickup: ['ready_for_pickup'],
  delivering: ['delivering'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
};

const LIST_FIELDS =
  'orderCode orderNumber customer restaurant shipper status total totalPrice payment.method payment.status ' +
  'delivery.recipientName items.quantity createdAt timeouts';

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

// Refund requested (or a transfer that failed) and not confirmed yet
const OWED_REFUND_FILTER = { 'refund.status': { $in: ['pending', 'failed'] } };

// Handed to the admin by a timeout rule and still unresolved. $and keeps the keyword $or of the base filter.
const ATTENTION_FILTER = {
  $and: [
    {
      $or: [
        { status: 'preparing', 'timeouts.prepEscalatedAt': { $ne: null } },
        { status: { $in: SHIPPER_POOL_STATUSES }, shipper: null, 'timeouts.shipperAlertedAt': { $ne: null } },
        { status: 'ready_for_pickup', shipper: { $ne: null }, 'timeouts.pickupAlertedAt': { $ne: null } },
      ],
    },
  ],
};

const tabFilter = (status) => {
  if (status === 'all') return {};
  if (status === 'refund_pending') return OWED_REFUND_FILTER;
  if (status === 'attention') return ATTENTION_FILTER;
  return { status: { $in: TAB_STATUSES[status] } };
};

export const listOrders = async ({ page, limit, status, ...filters }) => {
  const baseFilter = await buildBaseFilter(filters);
  const filter = { ...baseFilter, ...tabFilter(status) };

  const [items, totalItems, statusCounts, owedRefunds, attention] = await Promise.all([
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
    Order.countDocuments({ ...baseFilter, ...OWED_REFUND_FILTER }),
    Order.countDocuments({ ...baseFilter, ...ATTENTION_FILTER }),
  ]);

  const counts = { all: statusCounts.all, refund_pending: owedRefunds, attention };
  for (const [tab, statuses] of Object.entries(TAB_STATUSES)) {
    counts[tab] = statuses.reduce((sum, orderStatus) => sum + statusCounts[orderStatus], 0);
  }
  return { ...toPage(items, { page, limit }, totalItems), counts };
};

// Orders the admin may cancel: the food is not on its way yet. A shipper may have accepted the order but not
// picked it up; once picked up (delivering), the delivery issue flow (UC34 / UC45) handles it instead.
const ADMIN_CANCELLABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup'];
const ACTION_ORDER_FIELDS = 'orderCode orderNumber status shipper restaurant customer payment total totalPrice';

const findPlacedOrder = async (orderId) => {
  const order = await Order.findOne({ _id: orderId, ...PLACED_ORDER_FILTER }).select(ACTION_ORDER_FIELDS).lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  return order;
};

/**
 * TO-05 (decision D3) - the admin cancels for the customer, e.g. a kitchen far past its preparation time,
 * or a shipper who accepted the order and never came. Same cancellation as the timeout rules: by "system",
 * refund request when paid, restaurant not compensated. The shipper (if any) is freed for a new order.
 */
export const cancelOrderAsAdmin = async (orderId, { note }) => {
  const order = await findPlacedOrder(orderId);
  if (!ADMIN_CANCELLABLE_STATUSES.includes(order.status)) {
    throw new ApiError(409, 'Shipper đã lấy hàng. Hãy xử lý đơn này qua báo cáo sự cố giao hàng.');
  }

  const cancelNote = `Quản trị viên hủy thay khách: ${note}`;
  const result = order.shipper
    ? await cancelAssignedOrder(order, { reason: 'admin_cancel', note: cancelNote, action: 'Quản trị viên hủy đơn' })
    : await cancelOrderBySystem(order, {
        reason: 'admin_cancel',
        note: cancelNote,
        action: 'Quản trị viên hủy đơn',
        extraFilter: { shipper: null },
      });
  if (!result) {
    throw new ApiError(409, 'Đơn hàng vừa thay đổi trạng thái, vui lòng tải lại');
  }

  const code = order.orderCode || order.orderNumber;
  const restaurant = await Restaurant.findById(order.restaurant).select('owner').lean();
  await sendRealtimeNotification(order.customer, {
    title: 'Đơn hàng đã được hủy',
    message: `Quản trị viên đã hủy đơn #${code}: ${note}.${result.isPaid ? ' Tiền hoàn đã được cộng vào ví ảo của bạn.' : ''}`,
    type: 'order',
    orderId,
    link: result.isPaid ? '/wallet' : `/orders/${orderId}`,
  });
  if (restaurant?.owner) {
    await sendRealtimeNotification(restaurant.owner, {
      title: `Đơn #${code} đã bị quản trị viên hủy`,
      message: note,
      type: 'order',
      orderId,
      link: `/restaurant/orders?order=${orderId}`,
    });
  }
  return getOrderDetail(orderId);
};

/**
 * The shipper accepted the order but does not pick it up: give it back to the pool for another shipper.
 * Only before pickup (kitchen cooking or food ready); the food is still at the restaurant.
 */
export const releaseShipperAsAdmin = async (orderId, { note }) => {
  const order = await findPlacedOrder(orderId);
  if (!NOT_PICKED_UP_STATUSES.includes(order.status) || !order.shipper) {
    throw new ApiError(409, 'Chỉ đổi shipper được khi shipper đã nhận đơn nhưng chưa lấy hàng');
  }
  const released = await releaseOrderToPool(order, { note: `Quản trị viên chuyển đơn cho shipper khác: ${note}` });
  if (!released) {
    throw new ApiError(409, 'Đơn hàng vừa thay đổi trạng thái, vui lòng tải lại');
  }
  return getOrderDetail(orderId);
};

/**
 * R06 - the admin records the result of a refund transfer (no gateway refund API yet).
 * succeeded: needs the transfer reference; only now payment.status becomes "refunded" (Order + Payment).
 * failed: the refund stays owed with the reason, and can be confirmed later.
 * Conditional on the refund status just read: two admins (or a double click) cannot refund twice.
 */
export const resolveRefund = async (adminId, orderId, { result, reference, note }) => {
  const order = await Order.findOne({ _id: orderId, ...PLACED_ORDER_FILTER })
    .select('refund payment customer orderCode orderNumber')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  if (!['pending', 'failed'].includes(order.refund?.status)) {
    throw new ApiError(409, 'Đơn hàng không có khoản hoàn tiền đang chờ xử lý');
  }

  const now = new Date();
  const amount = order.refund.amount;
  const succeeded = result === 'succeeded';
  const refund = { ...order.refund, status: result, note, by: adminId, ...(succeeded && { reference, completedAt: now }) };
  const payment = succeeded
    ? { ...order.payment, status: 'refunded', refundedAt: now, refundAmount: amount }
    : order.payment;

  const updated = await Order.findOneAndUpdate(
    { _id: orderId, 'refund.status': order.refund.status },
    {
      $set: {
        refund,
        payment,
        // findOneAndUpdate skips the model hook: keep the legacy fields of the customer screens in step
        ...legacyPaymentFromCanonical(payment, refund),
      },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (!updated) {
    throw new ApiError(409, 'Khoản hoàn tiền vừa được xử lý, vui lòng tải lại');
  }

  if (succeeded) {
    if (order.customer) {
      await creditWalletRefund({
        userId: order.customer,
        orderId,
        orderCode: order.orderCode || order.orderNumber,
        amount,
      });
    }
    await Payment.updateMany({ order: orderId, status: 'success' }, { $set: { status: 'refunded' } });
  }
  await recordStatusChange({
    orderId,
    fromStatus: updated.status,
    toStatus: updated.status,
    role: 'admin',
    action: succeeded ? 'Đã hoàn tiền' : 'Hoàn tiền chưa thành công',
    note: succeeded
      ? `Đã chuyển trả ${amount.toLocaleString('vi-VN')}đ (mã giao dịch ${reference})`
      : `${note}. Nền tảng sẽ xử lý lại`,
  });
  if (order.customer) {
    sendRealtimeNotification(order.customer, {
      title: succeeded ? 'Đã hoàn tiền đơn hàng 💰' : 'Hoàn tiền đang được xử lý lại',
      message: succeeded
        ? `Đơn #${order.orderCode || order.orderNumber} đã được hoàn ${amount.toLocaleString('vi-VN')}đ (mã giao dịch ${reference}).`
        : `Việc hoàn tiền đơn #${order.orderCode || order.orderNumber} chưa thành công, nền tảng sẽ liên hệ và xử lý lại.`,
      type: 'order',
      orderId,
      link: `/orders/${orderId}`,
    });
  }

  return getOrderDetail(orderId);
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
