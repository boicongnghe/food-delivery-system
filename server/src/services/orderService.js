import mongoose from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Address from '../models/Address.js';
import PromotionRule from '../models/PromotionRule.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import ApiError from '../utils/ApiError.js';
import { legacyCancellationFromCanonical, legacyPaymentFromCanonical } from '../utils/orderFieldSync.js';
import { recordStatusChange } from './orderHistoryService.js';
import { refundRequestFields } from './orderPolicy.js';
import { validateAndApplyPromotion } from './promotionService.js';
import { completeDelivery } from './shipperOrderService.js';
import { sendRealtimeNotification } from '../socket.js';
import User from '../models/User.js';
import { getOrderAcceptance } from '../utils/openingHours.js';
import { getOrderTimeouts } from './settingService.js';
import {
  getRouteDistanceAndDuration,
  resolveLocationFromAddress,
  calculateShippingFee,
  MAX_DELIVERY_DISTANCE_KM,
  BASE_DISTANCE_KM,
  BASE_SHIPPING_FEE,
  PER_KM_FEE,
} from '../utils/distance.js';

/**
 * Can the restaurant take a new order right now? Approved, inside a shift (TO-09: no schedule = closed),
 * and not within the last closingCutoff minutes of that shift (TO-10).
 */
const assertRestaurantTakingOrders = async (restaurant) => {
  if (restaurant.status !== 'approved') {
    throw new ApiError(400, 'Nhà hàng chưa được kích hoạt hoặc đang tạm ngưng hoạt động');
  }
  const { closingCutoff } = await getOrderTimeouts();
  const acceptance = getOrderAcceptance(restaurant.openingHours, closingCutoff);
  if (acceptance.reason === 'closed') {
    throw new ApiError(
      400,
      `Nhà hàng "${restaurant.name}" hiện đang đóng cửa (ngoài giờ phục vụ). Vui lòng đặt món trong khung giờ hoạt động của quán.`,
    );
  }
  if (acceptance.reason === 'cutoff') {
    throw new ApiError(
      400,
      `Nhà hàng "${restaurant.name}" sắp đóng cửa nên đã ngừng nhận đơn mới (nhận đơn đến ${acceptance.lastOrderTime}).`,
    );
  }
};

const MAX_ITEM_QUANTITY = 99;
const MAX_ITEM_NOTE_LENGTH = 200;

const invalidItem = (message) => new ApiError(400, message);

/**
 * Options chosen by the customer -> the menu's own options with their current price.
 * Required groups must be chosen, a group never exceeds maxSelect, unknown groups/options are rejected.
 */
const resolveItemOptions = (menuItem, selected = []) => {
  if (!Array.isArray(selected)) throw invalidItem(`Lựa chọn của món "${menuItem.name}" không hợp lệ`);

  const knownGroups = new Set(menuItem.optionGroups.map((group) => group.name));
  const unknown = selected.find((choice) => !knownGroups.has(choice?.groupName));
  if (unknown) {
    throw invalidItem(`Lựa chọn "${unknown?.groupName || ''}" không còn trong món "${menuItem.name}", vui lòng chọn lại`);
  }

  const chosen = [];
  for (const group of menuItem.optionGroups) {
    const names = [...new Set(selected.filter((choice) => choice.groupName === group.name).map((choice) => choice.name))];
    if (group.isRequired && names.length === 0) {
      throw invalidItem(`Vui lòng chọn "${group.name}" cho món "${menuItem.name}"`);
    }
    if (names.length > group.maxSelect) {
      throw invalidItem(`"${group.name}" của món "${menuItem.name}" chỉ được chọn tối đa ${group.maxSelect}`);
    }
    for (const name of names) {
      const option = group.options.find((candidate) => candidate.name === name);
      if (!option) {
        throw invalidItem(`Lựa chọn "${name}" không còn trong món "${menuItem.name}", vui lòng chọn lại`);
      }
      chosen.push({ groupName: group.name, name: option.name, price: option.price });
    }
  }
  return chosen;
};

// One cart line -> order item snapshot (later menu changes never alter it)
const buildOrderItem = async (restaurantId, item) => {
  // menuItemId; foodId / food kept for carts saved before the menu became the only catalogue
  const menuItemId = item.menuItemId || item.foodId || item.food;
  if (!mongoose.isValidObjectId(menuItemId)) {
    throw invalidItem('Món ăn trong giỏ không hợp lệ, vui lòng chọn lại');
  }
  const quantity = Number(item.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
    throw invalidItem(`Số lượng mỗi món phải là số nguyên từ 1 đến ${MAX_ITEM_QUANTITY}`);
  }

  const menuItem = await MenuItem.findOne({ _id: menuItemId, isDeleted: false }).lean();
  if (!menuItem || !menuItem.isVisible) {
    throw new ApiError(404, 'Món ăn không tồn tại hoặc đã ngừng phục vụ');
  }
  if (String(menuItem.restaurant) !== String(restaurantId)) {
    throw invalidItem(`Món '${menuItem.name}' không thuộc nhà hàng đã chọn`);
  }
  if (!menuItem.isAvailable) {
    throw invalidItem(`Món '${menuItem.name}' hiện tại đã hết hàng`);
  }

  const options = resolveItemOptions(menuItem, item.options);
  const unitPrice = menuItem.price + options.reduce((sum, option) => sum + option.price, 0);
  return {
    menuItem: menuItem._id,
    name: menuItem.name,
    image: menuItem.image || '',
    price: unitPrice,
    unitPrice,
    quantity,
    options,
    note: String(item.note || '').trim().slice(0, MAX_ITEM_NOTE_LENGTH),
    lineTotal: unitPrice * quantity,
  };
};

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

  await assertRestaurantTakingOrders(restaurant);

  // Prices, availability and options always come from the restaurant's menu (never trust the client)
  let subtotal = 0;
  const snapshotItems = [];

  for (const item of items) {
    const snapshot = await buildOrderItem(restaurantId, item);
    subtotal += snapshot.lineTotal;
    snapshotItems.push(snapshot);
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
    // Same amount in both: the kitchen, reports and admin read "discount"
    discount: discountAmount,
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
    .populate('restaurant', 'name address phone logo');

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
    .populate('restaurant', 'name address phone logo')
    .sort({ createdAt: -1 });
};

// Orders the customer may still cancel: the kitchen has not started cooking
const CUSTOMER_CANCELLABLE_STATUSES = ['pending', 'confirmed'];

export const cancelOrder = async (orderId, userId, reason) => {
  const order = await Order.findOne({ _id: orderId, customer: userId })
    .select('status payment total totalPrice')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
    throw new ApiError(400, `Không thể hủy đơn khi đang ở trạng thái '${order.status}'`);
  }

  const now = new Date();
  const amount = order.total || order.totalPrice || 0;
  const isPaid = order.payment.status === 'paid';
  const cancellation = {
    by: 'customer',
    reason: 'customer_request',
    note: String(reason || 'Khách hàng yêu cầu hủy đơn').trim().slice(0, 300),
    at: now,
  };
  // UC17: a paid order gets a refund request; the money is only "refunded" once an admin confirms the transfer
  const paymentUpdate = isPaid ? refundRequestFields(amount, now) : { 'payment.status': 'cancelled' };
  // findOneAndUpdate skips the model hook: write the legacy fields read by the customer screens too
  const legacyUpdate = {
    ...legacyPaymentFromCanonical(
      { method: order.payment.method, status: isPaid ? 'paid' : 'cancelled', refundAmount: 0 },
      isPaid ? { status: 'pending', amount } : null,
    ),
    ...legacyCancellationFromCanonical(cancellation),
  };

  // Conditional on the status and payment just read: if the kitchen accepts at the same moment,
  // only one of the two requests wins (no cancelling an order that is already cooking)
  const cancelled = await Order.findOneAndUpdate(
    { _id: orderId, customer: userId, status: order.status, 'payment.status': order.payment.status },
    {
      $set: { status: 'cancelled', cancellation, ...paymentUpdate, ...legacyUpdate },
      $push: { statusHistory: { status: 'cancelled', at: now, byRole: 'customer' } },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (!cancelled) {
    throw new ApiError(409, 'Đơn hàng vừa thay đổi trạng thái (quán có thể đã nhận đơn). Vui lòng tải lại.');
  }

  await recordStatusChange({
    orderId: cancelled._id,
    fromStatus: order.status,
    toStatus: 'cancelled',
    role: 'customer',
    action: isPaid ? 'Hủy đơn - chờ hoàn tiền' : 'Hủy đơn',
    note: cancellation.note + (isPaid ? ` (Sẽ hoàn ${amount.toLocaleString('vi-VN')}đ)` : ''),
  });

  return cancelled;
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

  // A shipper is delivering it: finish the delivery the same way as the shipper's "delivered"
  // (shipping fee credited, shipper free for a new order, COD paid), whoever confirms first
  if (order.shipper) {
    const { order: delivered } = await completeDelivery({
      orderId: order._id,
      shipperId: order.shipper,
      customerId: userId,
      byRole: 'customer',
    });
    return delivered;
  }

  // No shipper on the order (demo progress tool): only the order itself changes
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

  await assertRestaurantTakingOrders(restaurant);

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
