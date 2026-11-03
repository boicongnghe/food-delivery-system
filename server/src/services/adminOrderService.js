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
import { cancelOrderBySystem } from './orderCancelService.js';
import { recordStatusChange } from './orderHistoryService.js';
import { PLACED_ORDER_FILTER } from './orderPolicy.js';

// Platform order list for the admin. Abandoned online checkouts are not orders.
// The only change an admin makes here is recording the result of a refund transfer.

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
        { status: 'ready_for_pickup', shipper: null, 'timeouts.shipperAlertedAt': { $ne: null } },
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

// Orders the admin may cancel: the food is not on its way yet. Once a shipper took the order, the
// delivery issue flow (UC34 / UC45) handles it instead.
const ADMIN_CANCELLABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup'];

/**
 * TO-05 (decision D3) - the admin cancels for the customer, e.g. a kitchen far past its preparation time.
 * Same cancellation as the timeout rules: by "system", refund request when paid, restaurant not compensated.
 */
export const cancelOrderAsAdmin = async (orderId, { note }) => {
  const order = await Order.findOne({ _id: orderId, ...PLACED_ORDER_FILTER })
    .select('orderCode orderNumber status shipper restaurant customer payment total totalPrice')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  if (!ADMIN_CANCELLABLE_STATUSES.includes(order.status)) {
    throw new ApiError(409, 'Chỉ hủy được đơn chưa giao cho shipper');
  }
  if (order.shipper) {
    throw new ApiError(409, 'Shipper đã nhận đơn này. Hãy xử lý qua sự cố giao hàng.');
  }

  const result = await cancelOrderBySystem(order, {
    reason: 'admin_cancel',
    note: `Quản trị viên hủy thay khách: ${note}`,
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
    message: `Quản trị viên đã hủy đơn #${code}: ${note}.${result.isPaid ? ' Yêu cầu hoàn tiền đã được tạo.' : ''}`,
    type: 'order',
    orderId,
    link: `/orders/${orderId}`,
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
