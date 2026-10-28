import Order from '../models/Order.js';
import Food from '../models/Food.js';
import Restaurant from '../models/Restaurant.js';
import PromotionRule from '../models/PromotionRule.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import ApiError from '../utils/ApiError.js';
import { validateAndApplyPromotion } from './promotionService.js';

const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
};

export const createOrder = async (userId, data) => {
  const { restaurantId, items, deliveryAddress, paymentMethod = 'banking', promotionCode } = data;

  if (paymentMethod !== 'banking') {
    throw new ApiError(400, 'Hệ thống hiện tại chỉ chấp nhận thanh toán bằng chuyển khoản ngân hàng');
  }

  if (!restaurantId || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Đơn hàng phải có ít nhất 1 món ăn và nhà hàng hợp lệ');
  }

  if (!deliveryAddress || !deliveryAddress.recipientName || !deliveryAddress.phone || !deliveryAddress.addressLine) {
    throw new ApiError(400, 'Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng');
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new ApiError(404, 'Nhà hàng không tồn tại');
  }

  // Verify and fetch fresh food prices from database (never trust client prices)
  let subtotal = 0;
  const snapshotItems = [];

  for (const item of items) {
    const food = await Food.findById(item.foodId || item.food);
    if (!food) {
      throw new ApiError(404, `Món ăn không tồn tại hoặc đã ngừng phục vụ`);
    }

    if (food.restaurant.toString() !== restaurantId.toString()) {
      throw new ApiError(400, `Món '${food.name}' không thuộc nhà hàng đã chọn`);
    }

    if (!food.isAvailable) {
      throw new ApiError(400, `Món '${food.name}' hiện tại đã hết hàng`);
    }

    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const itemTotal = food.price * quantity;
    subtotal += itemTotal;

    snapshotItems.push({
      food: food._id,
      name: food.name,
      price: food.price,
      quantity,
      note: item.note || '',
    });
  }

  // Shipping fee
  const shippingFee = 15000;

  // Validate promotion
  let discountAmount = 0;
  let appliedPromoCode = null;

  if (promotionCode) {
    const promoResult = await validateAndApplyPromotion(promotionCode, subtotal);
    discountAmount = promoResult.discountAmount;
    appliedPromoCode = promoResult.promotion ? promoResult.promotion.code : null;

    if (appliedPromoCode) {
      await PromotionRule.updateOne({ code: appliedPromoCode }, { $inc: { usedCount: 1 } });
    }
  }

  const totalPrice = Math.max(0, subtotal + shippingFee - discountAmount);

  const orderNumber = generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customer: userId,
    restaurant: restaurantId,
    items: snapshotItems,
    deliveryAddress: {
      recipientName: deliveryAddress.recipientName,
      phone: deliveryAddress.phone,
      addressLine: deliveryAddress.addressLine,
      note: deliveryAddress.note || '',
    },
    subtotal,
    shippingFee,
    promotion: {
      code: appliedPromoCode,
      discountAmount,
    },
    totalPrice,
    paymentMethod,
    paymentStatus: 'pending',
    status: 'pending',
    refundStatus: 'not_applicable',
  });

  // Record initial status history
  await OrderStatusHistory.create({
    order: order._id,
    fromStatus: null,
    toStatus: 'pending',
    action: 'Tạo đơn hàng',
    note: 'Khách hàng đã đặt đơn thành công',
    changedByRole: 'customer',
  });

  return order;
};

// Customers only see their own orders (full phone + address inside); admins see every order
export const getOrderById = async (orderId, user) => {
  const filter = user.role === 'admin' ? { _id: orderId } : { _id: orderId, customer: user._id };
  const order = await Order.findOne(filter)
    .populate('customer', 'fullName email phone')
    .populate('restaurant', 'name address phone image');

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  const timeline = await OrderStatusHistory.find({ order: order._id }).sort({ createdAt: 1 });

  return {
    ...order.toObject(),
    timeline,
  };
};

export const getCustomerOrders = async (userId, query = {}) => {
  const filter = { customer: userId };
  if (query.status) {
    filter.status = query.status;
  }
  return Order.find(filter)
    .populate('restaurant', 'name address phone image')
    .sort({ createdAt: -1 });
};

export const cancelOrder = async (orderId, userId, reason) => {
  const order = await Order.findOne({ _id: orderId, customer: userId });
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  // Can only cancel if order is in pending or confirmed
  const cancellableStatuses = ['pending', 'confirmed'];
  if (!cancellableStatuses.includes(order.status)) {
    throw new ApiError(400, `Không thể hủy đơn khi đang ở trạng thái '${order.status}'`);
  }

  const previousStatus = order.status;
  order.status = 'cancelled';
  order.cancelReason = reason || 'Khách hàng yêu cầu hủy đơn';
  order.cancelledBy = 'customer';
  order.$locals.changedByRole = 'customer';

  // Refund handling (UC17)
  if (order.paymentStatus === 'paid') {
    order.refundStatus = 'refunded';
    order.refundAmount = order.totalPrice;
  } else {
    order.refundStatus = 'not_applicable';
  }

  await order.save();

  await OrderStatusHistory.create({
    order: order._id,
    fromStatus: previousStatus,
    toStatus: 'cancelled',
    action: order.refundStatus === 'refunded' ? 'Hủy đơn & Hoàn tiền' : 'Hủy đơn',
    note: order.cancelReason + (order.refundStatus === 'refunded' ? ` (Đã hoàn lại ${order.totalPrice.toLocaleString('vi-VN')}đ)` : ''),
    changedByRole: 'customer',
  });

  return order;
};

export const receiveOrder = async (orderId, userId) => {
  const order = await Order.findOne({ _id: orderId, customer: userId });
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  if (order.status === 'cancelled') {
    throw new ApiError(400, 'Đơn hàng này đã bị hủy');
  }
  // Only food that is on its way can be received (otherwise revenue is counted for food never cooked)
  if (order.status !== 'delivering') {
    throw new ApiError(400, 'Chỉ xác nhận đã nhận hàng khi đơn đang được giao');
  }

  const previousStatus = order.status;
  order.status = 'delivered';
  order.$locals.changedByRole = 'customer';
  await order.save();

  await OrderStatusHistory.create({
    order: order._id,
    fromStatus: previousStatus,
    toStatus: 'delivered',
    action: 'Đã nhận hàng',
    note: 'Khách hàng xác nhận đã nhận được món ăn',
    changedByRole: 'customer',
  });

  return order;
};

// Demo helper for the order tracking screen: the customer moves their OWN order through the middle steps.
// Never in production, never to delivered/cancelled (those have their own flows).
const DEMO_PROGRESS_STATUSES = ['confirmed', 'preparing', 'delivering'];

export const progressOrderStatus = async (orderId, user, nextStatus, note = '') => {
  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(403, 'Chức năng giả lập tiến độ chỉ dùng khi demo');
  }
  if (!DEMO_PROGRESS_STATUSES.includes(nextStatus)) {
    throw new ApiError(400, `Chỉ giả lập được các trạng thái: ${DEMO_PROGRESS_STATUSES.join(', ')}`);
  }

  const order = await Order.findOne({ _id: orderId, customer: user._id });
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  if (['delivered', 'cancelled'].includes(order.status)) {
    throw new ApiError(400, 'Đơn hàng đã kết thúc, không thể đổi trạng thái');
  }

  const previousStatus = order.status;
  order.status = nextStatus;
  order.$locals.changedByRole = 'system';
  await order.save();

  await OrderStatusHistory.create({
    order: order._id,
    fromStatus: previousStatus,
    toStatus: nextStatus,
    action: `Chuyển trạng thái sang ${nextStatus}`,
    note: note || `Hệ thống cập nhật tiến độ đơn hàng`,
    changedByRole: 'system',
  });

  return order;
};
