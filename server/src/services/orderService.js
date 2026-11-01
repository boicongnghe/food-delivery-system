import Order from '../models/Order.js';
import Food from '../models/Food.js';
import Restaurant from '../models/Restaurant.js';
import Address from '../models/Address.js';
import PromotionRule from '../models/PromotionRule.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import ApiError from '../utils/ApiError.js';
import { validateAndApplyPromotion } from './promotionService.js';
import { sendRealtimeNotification } from '../socket.js';
import User from '../models/User.js';
import { isRestaurantOpenNow } from '../utils/openingHours.js';
import {
  getRouteDistanceAndDuration,
  resolveLocationFromAddress,
  calculateShippingFee,
  MAX_DELIVERY_DISTANCE_KM,
  BASE_DISTANCE_KM,
  BASE_SHIPPING_FEE,
  PER_KM_FEE,
} from '../utils/distance.js';

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

  if (restaurant.status !== 'approved') {
    throw new ApiError(400, 'Nhà hàng chưa được kích hoạt hoặc đang tạm ngưng hoạt động');
  }

  if (!isRestaurantOpenNow(restaurant.openingHours)) {
    throw new ApiError(
      400,
      `Nhà hàng "${restaurant.name}" hiện đang đóng cửa (ngoài giờ phục vụ). Vui lòng đặt món trong khung giờ hoạt động của quán.`,
    );
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

  // Shipping fee calculation based on GPS distance
  let restLat = restaurant.location?.lat;
  let restLng = restaurant.location?.lng;
  if (restLat == null || restLng == null) {
    const resolvedRest = await resolveLocationFromAddress(restaurant.address);
    restLat = resolvedRest.lat;
    restLng = resolvedRest.lng;
  }

  let destLat = deliveryAddress.location?.lat;
  let destLng = deliveryAddress.location?.lng;
  let destText = deliveryAddress.addressLine || '';

  if ((destLat == null || destLng == null) && deliveryAddress.addressId) {
    const savedAddress = await Address.findById(deliveryAddress.addressId);
    if (savedAddress) {
      destText = destText || savedAddress.addressLine;
      if (savedAddress.location?.lat != null && savedAddress.location?.lng != null) {
        destLat = savedAddress.location.lat;
        destLng = savedAddress.location.lng;
      }
    } else {
      const user = await User.findOne({ 'addresses._id': deliveryAddress.addressId }, 'addresses');
      const embedded = user?.addresses?.id(deliveryAddress.addressId);
      if (embedded) {
        destText =
          destText ||
          [embedded.street, embedded.ward, embedded.district, embedded.city].filter(Boolean).join(', ');
        if (embedded.location?.lat != null && embedded.location?.lng != null) {
          destLat = embedded.location.lat;
          destLng = embedded.location.lng;
        }
      }
    }
  }

  if ((destLat == null || destLng == null) && destText) {
    const resolved = await resolveLocationFromAddress(destText);
    destLat = resolved.lat;
    destLng = resolved.lng;
  }

  const routeInfo = await getRouteDistanceAndDuration(restLat, restLng, destLat, destLng);
  const distanceKm = routeInfo.distanceKm;

  if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
    throw new ApiError(
      400,
      `Khoảng cách giao hàng theo đường thực tế là ${distanceKm} km, vượt quá bán kính giao hàng tối đa cho phép (${MAX_DELIVERY_DISTANCE_KM} km). Vui lòng chọn địa chỉ giao hàng gần hơn.`,
    );
  }

  const shippingFee = calculateShippingFee(distanceKm);

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
      location: destLat != null && destLng != null ? { lat: destLat, lng: destLng } : null,
    },
    distanceKm,
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

  // Bắn thông báo Realtime cho Nhà hàng và Khách hàng
  const shortCode = (order.orderNumber || order.orderCode || '').split('-').pop();

  if (restaurant?.owner) {
    sendRealtimeNotification(restaurant.owner, {
      title: `Đơn hàng mới #${shortCode} 🔔`,
      message: `Khách ${deliveryAddress.recipientName} vừa đặt đơn (${snapshotItems.length} món, ${totalPrice.toLocaleString('vi-VN')}đ). Bếp kiểm tra ngay!`,
      type: 'order',
      orderId: order._id,
      link: '/restaurant/orders',
    });
  }

  sendRealtimeNotification(userId, {
    title: `Đặt hàng thành công #${shortCode} 🎉`,
    message: `Đơn hàng của bạn đã gửi tới ${restaurant?.name}. Bếp sẽ xác nhận trong giây lát.`,
    type: 'order',
    orderId: order._id,
    link: `/orders/${order._id}`,
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

export const estimateShipping = async (userId, params) => {
  const { restaurantId, addressId, lat, lng } = params;

  if (!restaurantId) {
    throw new ApiError(400, 'Thiếu thông tin nhà hàng (restaurantId)');
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new ApiError(404, 'Nhà hàng không tồn tại');
  }

  if (restaurant.status !== 'approved') {
    throw new ApiError(400, 'Nhà hàng chưa được kích hoạt hoặc đang tạm ngưng hoạt động');
  }

  if (!isRestaurantOpenNow(restaurant.openingHours)) {
    throw new ApiError(
      400,
      `Nhà hàng "${restaurant.name}" hiện đang đóng cửa (ngoài giờ phục vụ). Vui lòng đặt món trong khung giờ hoạt động của quán.`,
    );
  }

  let restLat = restaurant.location?.lat;
  let restLng = restaurant.location?.lng;
  if (restLat == null || restLng == null) {
    const resolvedRest = await resolveLocationFromAddress(restaurant.address);
    restLat = resolvedRest.lat;
    restLng = resolvedRest.lng;
  }

  let destLat = lat != null && !isNaN(Number(lat)) ? Number(lat) : null;
  let destLng = lng != null && !isNaN(Number(lng)) ? Number(lng) : null;
  let destinationAddressText = '';

  if ((destLat == null || destLng == null) && addressId) {
    // 1. Kiểm tra trong Address collection
    const address = await Address.findById(addressId);
    if (address) {
      destinationAddressText = address.addressLine;
      if (address.location?.lat != null && address.location?.lng != null) {
        destLat = address.location.lat;
        destLng = address.location.lng;
      }
    } else {
      // 2. Kiểm tra trong User.addresses (địa chỉ nhúng trong User)
      const user = await User.findOne({ 'addresses._id': addressId }, 'addresses');
      const embedded = user?.addresses?.id(addressId);
      if (embedded) {
        destinationAddressText = [embedded.street, embedded.ward, embedded.district, embedded.city]
          .filter(Boolean)
          .join(', ');
        if (embedded.location?.lat != null && embedded.location?.lng != null) {
          destLat = embedded.location.lat;
          destLng = embedded.location.lng;
        }
      }
    }
  }

  // 3. Nếu địa chỉ chưa có tọa độ, tự động geocode từ tên đường qua OpenStreetMap
  if ((destLat == null || destLng == null) && destinationAddressText) {
    const resolved = await resolveLocationFromAddress(destinationAddressText);
    destLat = resolved.lat;
    destLng = resolved.lng;

    // Lưu lại vào DB để lần sau truy vấn siêu tốc
    Address.updateOne({ _id: addressId }, { $set: { location: resolved } }).catch(() => {});
    User.updateOne({ 'addresses._id': addressId }, { $set: { 'addresses.$.location': resolved } }).catch(() => {});
  }

  const routeInfo = await getRouteDistanceAndDuration(restLat, restLng, destLat, destLng);
  const distanceKm = routeInfo.distanceKm;
  const durationMinutes = routeInfo.durationMinutes;

  const isDeliverable = distanceKm <= MAX_DELIVERY_DISTANCE_KM;

  let shippingFee = 0;
  let message = null;

  if (isDeliverable) {
    shippingFee = calculateShippingFee(distanceKm);
  } else {
    message = `Khoảng cách giao hàng theo đường thực tế là ${distanceKm} km, vượt quá bán kính phục vụ tối đa (${MAX_DELIVERY_DISTANCE_KM} km).`;
  }

  return {
    distanceKm,
    durationMinutes,
    shippingFee,
    baseDistanceKm: BASE_DISTANCE_KM,
    baseFee: BASE_SHIPPING_FEE,
    perKmFee: PER_KM_FEE,
    maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
    isDeliverable,
    message,
  };
};
