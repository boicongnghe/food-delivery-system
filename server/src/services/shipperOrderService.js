import mongoose from 'mongoose';
import DriverDashboard from '../models/DriverDashboard.js';
import Order from '../models/Order.js';
import Shipper from '../models/Shipper.js';
import ApiError from '../utils/ApiError.js';
import { getDeliveryArea } from '../utils/deliveryArea.js';
import { recordStatusChange } from './orderHistoryService.js';
import { PAYMENT_ALLOWS_FULFILLMENT_FILTER } from './orderPolicy.js';
import driverDashboardService from './driverDashboardService.js';

const AVAILABLE_FILTER = {
  status: 'ready_for_pickup',
  shipper: null,
  ...PAYMENT_ALLOWS_FULFILLMENT_FILTER,
};
const ACTIVE_STATUSES = ['ready_for_pickup', 'delivering'];
const ACCEPTANCE_WINDOW_MS = 3 * 60 * 1000;
const DASHBOARD_PERIODS = ['today', 'week', 'month'];
const DASHBOARD_PERIOD_FIELDS = [
  'totalEarnings',
  'baseFare',
  'bonus',
  'tips',
  'completedTrips',
  'tripGoal',
  'walletBalance',
  'pendingBalance',
  'weeklyEarnings',
  'rating',
  'tier',
  'ratingCount',
  'consecutiveFiveStarTrips',
  'payoutBank',
  'earningsByHour',
  'forecast',
  'trips',
  'missions',
  'reviews',
  'badges',
  'hotspots',
];
const DASHBOARD_ARRAY_FIELDS = new Set([
  'earningsByHour',
  'forecast',
  'trips',
  'missions',
  'reviews',
  'badges',
  'hotspots',
]);
const DASHBOARD_STRING_FIELDS = new Set(['tier', 'payoutBank']);

const clearDemoDashboard = async (shipperId, session) => {
  const fields = { isDemo: false, 'profile.tier': '' };
  for (const period of DASHBOARD_PERIODS) {
    for (const field of DASHBOARD_PERIOD_FIELDS) {
      fields[`periods.${period}.${field}`] = DASHBOARD_ARRAY_FIELDS.has(field)
        ? []
        : DASHBOARD_STRING_FIELDS.has(field)
          ? ''
          : 0;
    }
  }

  await DriverDashboard.updateOne(
    { userId: shipperId, isDemo: true },
    { $set: fields },
    { session },
  );
};

export const getShipperStatus = async (shipperId) => {
  const shipper = await Shipper.findOne({ user: shipperId }).select('status').lean();
  return shipper?.status ?? null;
};

const getDriverDashboard = async (shipperId) => {
  await driverDashboardService.getDashboard(shipperId, 'today');
  const dashboard = await DriverDashboard.findOne({ userId: shipperId }).lean();
  if (!dashboard) {
    throw new ApiError(404, 'Không tìm thấy hồ sơ tài xế');
  }
  if (!dashboard.isOnline) {
    throw new ApiError(409, 'Hãy chuyển trạng thái sang Đang trực để nhận đơn giao hàng');
  }
  return dashboard;
};

const toAvailableOrder = (order) => {
  return {
    _id: order._id,
    orderCode: order.orderCode,
    status: order.status,
    restaurant: {
      _id: order.restaurant._id,
      name: order.restaurant.name,
      address: order.restaurant.address,
    },
    delivery: {
      area: getDeliveryArea(order.delivery.address),
      type: order.delivery.type,
      expectedAt: order.delivery.expectedAt,
    },
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    estimatedPay: order.shippingFee,
    total: order.total,
    amountToCollect: order.payment.method === 'cod' ? order.total : 0,
    readyAt: order.readyAt,
  };
};

export const listAvailableForPickup = async (shipperId, { page, limit }) => {
  await getDriverDashboard(shipperId);
  const [orders, totalItems] = await Promise.all([
    Order.find(AVAILABLE_FILTER)
      .populate('restaurant', 'name address')
      .sort({ readyAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('orderCode restaurant delivery.address delivery.type delivery.expectedAt items.quantity total shippingFee payment readyAt status')
      .lean(),
    Order.countDocuments(AVAILABLE_FILTER),
  ]);

  return {
    items: orders.map(toAvailableOrder),
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  };
};

export const getAvailableOrderDetail = async (shipperId, orderId) => {
  await getDriverDashboard(shipperId);
  const order = await Order.findOne({ _id: orderId, ...AVAILABLE_FILTER })
    .populate('restaurant', 'name address phone')
    .select('orderCode restaurant delivery items total shippingFee payment readyAt status')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Đơn hàng không còn trong danh sách chờ nhận');
  }

  return toAvailableOrder(order);
};

export const getActiveOrders = async (shipperId) => {
  const orders = await Order.find({ shipper: shipperId, status: { $in: ACTIVE_STATUSES } })
    .populate('restaurant', 'name address phone')
    .populate('customer', 'fullName phone')
    .sort({ shipperAcceptedAt: -1 })
    .lean();
  return orders;
};

export const acceptOrder = async (shipperId, orderId) => {
  await getDriverDashboard(shipperId);
  const order = await Order.findOne({ _id: orderId, ...AVAILABLE_FILTER })
    .populate('restaurant', 'name address phone')
    .lean();
  if (!order) {
    throw new ApiError(409, 'Đơn hàng không còn khả dụng, vui lòng tải lại danh sách');
  }
  if (await Order.exists({ shipper: shipperId, status: { $in: ACTIVE_STATUSES } })) {
    throw new ApiError(409, 'Bạn đang có một đơn giao hàng chưa hoàn tất');
  }

  const reserved = await DriverDashboard.findOneAndUpdate(
    {
      userId: shipperId,
      $or: [{ activeOrderId: null }, { activeOrderId: { $exists: false } }],
    },
    { $set: { activeOrderId: orderId } },
    { new: true },
  );
  if (!reserved) {
    throw new ApiError(409, 'Bạn đang có một đơn giao hàng chưa hoàn tất');
  }

  const acceptedAt = new Date();
  const accepted = await Order.findOneAndUpdate(
    { _id: orderId, ...AVAILABLE_FILTER },
    { $set: { shipper: shipperId, shipperAcceptedAt: acceptedAt } },
    { new: true, runValidators: true },
  );
  if (!accepted) {
    await DriverDashboard.updateOne(
      { userId: shipperId, activeOrderId: orderId },
      { $set: { activeOrderId: null } },
    );
    throw new ApiError(409, 'Đơn hàng vừa được shipper khác nhận');
  }

  return Order.findById(accepted._id)
    .populate('restaurant', 'name address phone')
    .populate('customer', 'fullName phone')
    .lean();
};

export const cancelAcceptance = async (shipperId, orderId) => {
  const cutoff = new Date(Date.now() - ACCEPTANCE_WINDOW_MS);
  const released = await Order.findOneAndUpdate(
    {
      _id: orderId,
      shipper: shipperId,
      status: 'ready_for_pickup',
      shipperAcceptedAt: { $gte: cutoff },
    },
    { $set: { shipper: null, shipperAcceptedAt: null } },
    { new: true },
  );
  if (!released) {
    throw new ApiError(409, 'Chỉ có thể trả đơn trong 3 phút sau khi nhận và trước khi xác nhận lấy hàng');
  }

  await DriverDashboard.updateOne(
    { userId: shipperId, activeOrderId: orderId },
    { $set: { activeOrderId: null } },
  );
  return { orderId, released: true };
};

export const confirmPickup = async (shipperId, orderId) => {
  const order = await Order.findOne({ _id: orderId, shipper: shipperId, status: 'ready_for_pickup' })
    .select('_id')
    .lean();
  if (!order) {
    throw new ApiError(409, 'Đơn hàng không ở trạng thái chờ lấy hàng');
  }

  const now = new Date();
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, shipper: shipperId, status: 'ready_for_pickup' },
    {
      $set: { status: 'delivering' },
      $push: { statusHistory: { status: 'delivering', at: now, byRole: 'shipper' } },
    },
    { new: true, runValidators: true },
  );
  if (!updated) {
    throw new ApiError(409, 'Trạng thái đơn vừa thay đổi, vui lòng tải lại');
  }
  await recordStatusChange({
    orderId: updated._id,
    fromStatus: 'ready_for_pickup',
    toStatus: 'delivering',
    role: 'shipper',
    action: 'Shipper đã lấy hàng',
    note: 'Đơn hàng đang trên đường giao tới bạn',
  });
  return updated;
};

export const startCustomerWait = async (shipperId, orderId) => {
  const activeOrder = await Order.findOne({
    _id: orderId,
    shipper: shipperId,
    status: { $in: ACTIVE_STATUSES },
  }).select('_id').lean();
  if (!activeOrder) {
    throw new ApiError(409, 'Chỉ có thể bắt đầu chờ khách khi đơn đang hoạt động');
  }
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      shipper: shipperId,
      status: { $in: ACTIVE_STATUSES },
      customerWaitStartedAt: null,
    },
    { $set: { customerWaitStartedAt: new Date() } },
    { new: true, projection: { customerWaitStartedAt: 1 } },
  ).lean();
  if (order) return { startedAt: order.customerWaitStartedAt };

  const existing = await Order.findOne({
    _id: orderId,
    shipper: shipperId,
    status: { $in: ACTIVE_STATUSES },
  }).select('customerWaitStartedAt').lean();
  if (!existing) {
    throw new ApiError(409, 'Chỉ có thể bắt đầu chờ khách khi đơn đang hoạt động');
  }
  if (!existing.customerWaitStartedAt) {
    throw new ApiError(409, 'Không thể khởi động bộ đếm chờ khách, vui lòng thử lại');
  }
  return { startedAt: existing.customerWaitStartedAt };
};

export const recordUnansweredCall = async (shipperId, orderId) => {
  const activeOrder = await Order.findOne({
    _id: orderId,
    shipper: shipperId,
    status: { $in: ACTIVE_STATUSES },
  }).select('customerWaitStartedAt').lean();
  if (!activeOrder?.customerWaitStartedAt) {
    throw new ApiError(409, 'Hãy bắt đầu bộ đếm chờ khách trước khi ghi nhận cuộc gọi');
  }
  const now = new Date();
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      shipper: shipperId,
      status: { $in: ACTIVE_STATUSES },
      customerWaitStartedAt: activeOrder.customerWaitStartedAt,
    },
    { $push: { unansweredCallsAt: now } },
    { new: true, projection: { unansweredCallsAt: 1 } },
  ).lean();
  if (!order) {
    throw new ApiError(409, 'Hãy bắt đầu bộ đếm chờ khách trước khi ghi nhận cuộc gọi');
  }
  return { unansweredCalls: order.unansweredCallsAt.length };
};

const DELIVERED_BY = {
  shipper: { action: 'Giao hàng thành công', note: 'Shipper đã giao món tới khách hàng' },
  customer: { action: 'Đã nhận hàng', note: 'Khách hàng xác nhận đã nhận được món ăn' },
};

// COD is paid when the food is handed over. findOneAndUpdate skips the model hook that does this on save(),
// so both field sets are written here (complaint refunds and the customer screens read them).
const codPaidFields = (order, at) =>
  order.payment?.method === 'cod' && order.payment.status === 'unpaid'
    ? { 'payment.status': 'paid', 'payment.paidAt': at, paymentStatus: 'paid' }
    : {};

/**
 * Finish a delivery: order -> delivered, COD -> paid, shipping fee credited to the shipper, slot freed.
 * One transaction, conditional on the order still being delivered by this shipper and not credited yet,
 * so the shipper's "delivered" and the customer's "received" can never both credit the same order.
 * @param {{ orderId, shipperId, byRole: 'shipper' | 'customer', customerId? }} params
 */
export const completeDelivery = async ({ orderId, shipperId, byRole, customerId = null }) => {
  const ownerFilter = { _id: orderId, shipper: shipperId, status: 'delivering', ...(customerId && { customer: customerId }) };
  const order = await Order.findOne(ownerFilter).populate('restaurant', 'name address').lean();
  if (!order) {
    throw new ApiError(409, 'Đơn hàng không ở trạng thái đang giao');
  }
  // The wallet snapshot is created on the first dashboard request; make sure the payout has somewhere to go
  await driverDashboardService.getDashboard(shipperId, 'today');

  const payout = Math.max(0, order.shippingFee || 0);
  const deliveredAt = new Date();
  const session = await mongoose.startSession();
  try {
    let deliveredOrder;
    await session.withTransaction(async () => {
      deliveredOrder = await Order.findOneAndUpdate(
        { ...ownerFilter, 'payment.status': order.payment.status, payoutCreditedAt: null },
        {
          $set: { status: 'delivered', payoutCreditedAt: deliveredAt, ...codPaidFields(order, deliveredAt) },
          $push: { statusHistory: { status: 'delivered', at: deliveredAt, byRole } },
        },
        { new: true, runValidators: true, session },
      );
      if (!deliveredOrder) {
        throw new ApiError(409, 'Đơn hàng vừa được hoàn tất hoặc trạng thái đã thay đổi');
      }

      await DriverDashboard.updateOne(
        { userId: shipperId, activeOrderId: orderId },
        { $set: { activeOrderId: null } },
        { session },
      );
      await clearDemoDashboard(shipperId, session);
      const dashboardUpdate = await DriverDashboard.updateOne(
        { userId: shipperId },
        {
          $inc: {
            'periods.today.totalEarnings': payout,
            'periods.today.baseFare': payout,
            'periods.today.completedTrips': 1,
            'periods.today.weeklyEarnings': payout,
            walletBalance: payout,
            'periods.week.totalEarnings': payout,
            'periods.week.baseFare': payout,
            'periods.week.completedTrips': 1,
            'periods.week.weeklyEarnings': payout,
            'periods.month.totalEarnings': payout,
            'periods.month.baseFare': payout,
            'periods.month.completedTrips': 1,
            'periods.month.weeklyEarnings': payout,
          },
          $set: {
            'periods.today.pendingBalance': 0,
            'periods.week.pendingBalance': 0,
            'periods.month.pendingBalance': 0,
          },
          $push: {
            'periods.today.trips': {
              $each: [{
                id: order.orderCode,
                time: deliveredAt.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Ho_Chi_Minh',
                }),
                restaurant: order.restaurant.name,
                address: order.delivery.address,
                distance: '',
                baseFare: payout,
                bonus: 0,
                tip: 0,
                status: 'Đã giao',
                surge: false,
              }],
              $position: 0,
              $slice: 100,
            },
          },
        },
        { session },
      );
      if (!dashboardUpdate.matchedCount) {
        throw new ApiError(409, 'Không thể cập nhật ví tài xế; vui lòng thử lại');
      }
    });
    await recordStatusChange({
      orderId: deliveredOrder._id,
      fromStatus: 'delivering',
      toStatus: 'delivered',
      role: byRole,
      ...DELIVERED_BY[byRole],
    });
    return { order: deliveredOrder, payout };
  } finally {
    await session.endSession();
  }
};

export const confirmDelivered = (shipperId, orderId) =>
  completeDelivery({ orderId, shipperId, byRole: 'shipper' });
