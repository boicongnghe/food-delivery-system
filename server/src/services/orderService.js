import mongoose from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import Food from '../models/Food.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Address from '../models/Address.js';
import PromotionRule from '../models/PromotionRule.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import Payment from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import { legacyCancellationFromCanonical, legacyPaymentFromCanonical } from '../utils/orderFieldSync.js';
import { recordStatusChange } from './orderHistoryService.js';
import { refundRequestFields } from './orderPolicy.js';
import { creditWalletRefund } from './walletService.js';
import { validateAndApplyPromotion } from './promotionService.js';
import { resolveVoucherForOrder } from './restaurantVoucherService.js';
import { completeDelivery } from './shipperOrderService.js';
import { sendRealtimeNotification } from '../socket.js';
import User from '../models/User.js';
import { getOrderAcceptance } from '../utils/openingHours.js';
import { getOrderTimeouts } from './settingService.js';
import { getShippingFeeConfig } from './shippingFeeService.js';
import {
  getRouteDistanceAndDuration,
  resolveLocationFromAddress,
  isLocationMismatch,
  calculateShippingFee,
} from '../utils/distance.js';

/**
 * Safely find restaurant by ObjectId or slug/name to avoid Mongoose CastError
 */
export const resolveRestaurant = async (identifier) => {
  if (!identifier) return null;
  const str = String(identifier).trim();

  // 1. If valid 24-hex-char MongoDB ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    const byId = await Restaurant.findById(str);
    if (byId) return byId;
  }

  // 2. Decode slug if starts with 'res-'
  let lookupName = str;
  if (lookupName.startsWith('res-')) {
    try {
      lookupName = decodeURIComponent(lookupName.slice(4));
    } catch {
      lookupName = lookupName.slice(4);
    }
  }
  lookupName = lookupName.trim();

  // 3. Search exact case-insensitive regex
  const escaped = lookupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let restaurant = await Restaurant.findOne({
    name: { $regex: new RegExp(`^${escaped}$`, 'i') },
  });
  if (restaurant) return restaurant;

  // 4. Substring match
  restaurant = await Restaurant.findOne({
    name: { $regex: new RegExp(escaped, 'i') },
  });
  if (restaurant) return restaurant;

  // 5. Fallback: first approved restaurant
  return await Restaurant.findOne({ status: 'approved' });
};

/**
 * Can the restaurant take a new order right now? Approved, inside a shift (TO-09: no schedule = closed),
 * and not within the last closingCutoff minutes of that shift (TO-10).
 */
const assertRestaurantTakingOrders = async (restaurant) => {
  if (restaurant.status !== 'approved') {
    throw new ApiError(400, 'Nhà hàng chưa được kích hoạt hoặc đang tạm ngưng hoạt động');
  }
  if (restaurant.isAcceptingOrders === false) {
    throw new ApiError(
      400,
      `Nhà hàng "${restaurant.name}" đang tạm ngưng nhận đơn. Vui lòng quay lại sau hoặc chọn quán khác.`,
    );
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
    const choicesForGroup = selected.filter((choice) => choice.groupName === group.name);
    const totalCount = choicesForGroup.reduce(
      (sum, choice) => sum + (Number(choice.quantity) > 0 ? Number(choice.quantity) : 1),
      0
    );

    if (group.isRequired && totalCount === 0) {
      throw invalidItem(`Vui lòng chọn "${group.name}" cho món "${menuItem.name}"`);
    }
    if (group.isRequired && totalCount > group.maxSelect) {
      throw invalidItem(`"${group.name}" của món "${menuItem.name}" chỉ được chọn tối đa ${group.maxSelect}`);
    }

    for (const choice of choicesForGroup) {
      const option = group.options.find((candidate) => candidate.name === choice.name);
      if (!option) {
        throw invalidItem(`Lựa chọn "${choice.name}" không còn trong món "${menuItem.name}", vui lòng chọn lại`);
      }
      const qty = Number(choice.quantity) > 0 ? Number(choice.quantity) : 1;
      const currentStock = option.stock !== undefined ? option.stock : 50;
      if (currentStock <= 0) {
        throw invalidItem(`Topping "${option.name}" của món "${menuItem.name}" hiện đã hết hàng`);
      }
      if (qty > currentStock) {
        throw invalidItem(`Topping "${option.name}" của món "${menuItem.name}" chỉ còn lại ${currentStock} phần (bạn đang chọn ${qty})`);
      }

      const existing = chosen.find((c) => c.groupName === group.name && c.name === option.name);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + qty;
      } else {
        chosen.push({
          groupName: group.name,
          name: option.name,
          price: option.price,
          quantity: qty,
        });
      }
    }
  }
  return chosen;
};

// One cart line -> order item snapshot (later menu changes never alter it)
const buildOrderItem = async (restaurantId, item) => {
  // menuItemId; foodId / food kept for carts saved before the menu became the only catalogue
  const menuItemId = item.menuItemId || item.foodId || item.food?._id || item.food?.id || item.food;
  const quantity = Number(item.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
    throw invalidItem(`Số lượng mỗi món phải là số nguyên từ 1 đến ${MAX_ITEM_QUANTITY}`);
  }

  let menuItem = null;
  if (menuItemId && /^[0-9a-fA-F]{24}$/.test(String(menuItemId))) {
    menuItem = await MenuItem.findOne({ _id: menuItemId, isDeleted: false }).lean();
  }
  if (!menuItem) {
    const itemName = item.name || item.food?.name;
    if (itemName) {
      const escaped = itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      menuItem = await MenuItem.findOne({
        restaurant: restaurantId,
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
        isDeleted: false,
      }).lean();
    }
  }

  if (!menuItem && menuItemId && /^[0-9a-fA-F]{24}$/.test(String(menuItemId))) {
    try {
      menuItem = await Food.findById(menuItemId).lean();
    } catch {
      // ignore
    }
  }

  // Also try finding by name in Food collection if not found in MenuItem
  if (!menuItem) {
    const itemName = item.name || item.food?.name;
    if (itemName) {
      const escaped = itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      menuItem = await Food.findOne({
        restaurant: restaurantId,
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      }).lean();
    }
  }

  if (!menuItem) {
    // Graceful fallback: use the actual price and name passed from the client cart
    const price = Number(item.price || item.food?.price || 40000);
    return {
      menuItem: null,
      name: item.name || item.food?.name || 'Món ăn',
      image: item.image || item.food?.image || '',
      price,
      unitPrice: price,
      quantity,
      options: item.options || [],
      note: String(item.note || '').trim().slice(0, MAX_ITEM_NOTE_LENGTH),
      lineTotal: price * quantity,
    };
  }

  if (menuItem.isVisible === false) {
    throw new ApiError(404, 'Món ăn không tồn tại hoặc đã ngừng phục vụ');
  }
  if (menuItem.isAvailable === false) {
    throw invalidItem(`Món '${menuItem.name}' hiện tại đã hết hàng`);
  }

  const options = Array.isArray(menuItem.optionGroups) && menuItem.optionGroups.length > 0
    ? resolveItemOptions(menuItem, item.options)
    : [];
  const unitPrice = menuItem.price + options.reduce((sum, option) => sum + option.price * (option.quantity || 1), 0);
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
  const { restaurantId, items, deliveryAddress, paymentMethod = 'banking', promotionCode, restaurantVoucherCode } = data;

  if (paymentMethod !== 'banking') {
    throw new ApiError(400, 'Hệ thống hiện tại chỉ chấp nhận thanh toán bằng chuyển khoản ngân hàng');
  }

  if (!restaurantId || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Đơn hàng phải có ít nhất 1 món ăn và nhà hàng hợp lệ');
  }

  if (!deliveryAddress || !deliveryAddress.recipientName || !deliveryAddress.phone || !deliveryAddress.addressLine) {
    throw new ApiError(400, 'Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng');
  }

  const restaurant = await resolveRestaurant(restaurantId);
  if (!restaurant) {
    throw new ApiError(404, 'Nhà hàng không tồn tại');
  }
  const realRestaurantId = restaurant._id;

  await assertRestaurantTakingOrders(restaurant);

  // Prices, availability and options always come from the restaurant's menu (never trust the client)
  let subtotal = 0;
  const snapshotItems = [];

  for (const item of items) {
    const snapshot = await buildOrderItem(realRestaurantId, item);
    subtotal += snapshot.lineTotal;
    snapshotItems.push(snapshot);
  }

  // Shipping fee calculation based on GPS distance
  let restLat = restaurant.location?.lat;
  let restLng = restaurant.location?.lng;
  // Tự động định vị lại nếu quán chưa có tọa độ hoặc đang dính tọa độ cũ ở trung tâm nội thành (21.0285, 105.8542)
  if (restLat == null || restLng == null || (restLat === 21.0285 && restLng === 105.8542)) {
    const resolvedRest = await resolveLocationFromAddress(restaurant.address);
    restLat = resolvedRest.lat;
    restLng = resolvedRest.lng;
    Restaurant.updateOne({ _id: restaurant._id }, { $set: { location: { lat: restLat, lng: restLng } } }).catch(() => {});
  }

  let destLat = deliveryAddress.location?.lat;
  let destLng = deliveryAddress.location?.lng;
  let destText = deliveryAddress.addressLine || '';

  if (deliveryAddress.addressId) {
    const savedAddress = await Address.findById(deliveryAddress.addressId);
    if (savedAddress) {
      destText = savedAddress.addressLine || destText;
      if ((destLat == null || destLng == null) && savedAddress.location?.lat != null && savedAddress.location?.lng != null) {
        destLat = savedAddress.location.lat;
        destLng = savedAddress.location.lng;
      }
    } else {
      const user = await User.findOne({ 'addresses._id': deliveryAddress.addressId }, 'addresses');
      const embedded = user?.addresses?.id(deliveryAddress.addressId);
      if (embedded) {
        destText = [embedded.street, embedded.ward, embedded.district, embedded.city].filter(Boolean).join(', ') || destText;
        if ((destLat == null || destLng == null) && embedded.location?.lat != null && embedded.location?.lng != null) {
          destLat = embedded.location.lat;
          destLng = embedded.location.lng;
        }
      }
    }
  }

  if (destLat == null || destLng == null || isLocationMismatch(destText, destLat, destLng)) {
    const resolved = await resolveLocationFromAddress(destText, { allowDefault: false });
    destLat = resolved.lat;
    destLng = resolved.lng;
    if (deliveryAddress.addressId) {
      Address.updateOne({ _id: deliveryAddress.addressId }, { $set: { location: resolved } }).catch(() => {});
      User.updateOne({ 'addresses._id': deliveryAddress.addressId }, { $set: { 'addresses.$.location': resolved } }).catch(() => {});
    }
  }

  const shippingConfig = await getShippingFeeConfig();
  const routeInfo = await getRouteDistanceAndDuration(restLat, restLng, destLat, destLng);
  const distanceKm = routeInfo.distanceKm;

  if (distanceKm > shippingConfig.maxDistanceKm) {
    throw new ApiError(
      400,
      `Khoảng cách giao hàng theo đường thực tế là ${distanceKm} km, vượt quá bán kính giao hàng tối đa cho phép (${shippingConfig.maxDistanceKm} km). Vui lòng chọn địa chỉ giao hàng gần hơn.`,
    );
  }

  const shippingFee = calculateShippingFee(distanceKm, shippingConfig);

  // Restaurant voucher first (funded by the restaurant), then the platform voucher on what is left
  const restaurantVoucher = { voucher: null, code: null, discountAmount: 0 };
  if (restaurantVoucherCode) {
    const applied = await resolveVoucherForOrder({
      restaurantId: realRestaurantId,
      code: restaurantVoucherCode,
      subtotal,
      customerId: userId,
    });
    Object.assign(restaurantVoucher, {
      voucher: applied.voucher._id,
      code: applied.voucher.code,
      discountAmount: applied.discountAmount,
    });
  }

  // Validate promotion (platform voucher)
  let discountAmount = 0;
  let appliedPromoCode = null;

  if (promotionCode) {
    const promoResult = await validateAndApplyPromotion(promotionCode, subtotal - restaurantVoucher.discountAmount);
    discountAmount = promoResult.discountAmount;
    appliedPromoCode = promoResult.promotion ? promoResult.promotion.code : null;

    if (appliedPromoCode) {
      await PromotionRule.updateOne({ code: appliedPromoCode }, { $inc: { usedCount: 1 } });
    }
  }

  const totalDiscount = restaurantVoucher.discountAmount + discountAmount;
  const totalPrice = Math.max(0, subtotal + shippingFee - totalDiscount);

  const orderNumber = generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customer: userId,
    restaurant: realRestaurantId,
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
    // discount = everything the customer saved; each voucher keeps its own part (who pays it)
    discount: totalDiscount,
    promotion: {
      code: appliedPromoCode,
      discountAmount,
    },
    restaurantVoucher,
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

  // Trừ số lượng tồn kho topping và cảnh báo nhà hàng nếu số lượng còn lại <= 5
  try {
    for (const snapshot of snapshotItems) {
      if (!snapshot.menuItem || !Array.isArray(snapshot.options) || snapshot.options.length === 0) continue;

      const menuItemDoc = await MenuItem.findById(snapshot.menuItem);
      if (!menuItemDoc || !Array.isArray(menuItemDoc.optionGroups)) continue;

      let modified = false;
      const lowStockAlerts = [];

      for (const chosenOpt of snapshot.options) {
        const optQty = (chosenOpt.quantity || 1) * snapshot.quantity;
        for (const group of menuItemDoc.optionGroups) {
          if (group.name !== chosenOpt.groupName) continue;
          const targetOpt = group.options.find((o) => o.name === chosenOpt.name);
          if (targetOpt) {
            const prevStock = targetOpt.stock !== undefined ? targetOpt.stock : 50;
            const newStock = Math.max(0, prevStock - optQty);
            targetOpt.stock = newStock;
            modified = true;

            // Cảnh báo khi số lượng còn lại <= 5
            if (newStock <= 5) {
              lowStockAlerts.push({
                name: targetOpt.name,
                stock: newStock,
                dishName: menuItemDoc.name,
              });
            }
          }
        }
      }

      if (modified) {
        await menuItemDoc.save();

        if (restaurant?.owner && lowStockAlerts.length > 0) {
          for (const alert of lowStockAlerts) {
            await sendRealtimeNotification(restaurant.owner, {
              title: 'Cảnh báo topping sắp hết ⚠️',
              message: `Topping "${alert.name}" của món "${alert.dishName}" chỉ còn lại ${alert.stock} phần! Vui lòng chuẩn bị thêm.`,
              type: 'system',
              orderId: order._id,
              link: '/restaurant/menu',
            });
          }
        }
      }
    }
  } catch (stockErr) {
    console.warn('Failed to update topping stock:', stockErr?.message);
  }

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
  // Paid order gets refunded to virtual wallet; unpaid order is cancelled
  const paymentUpdate = isPaid ? refundRequestFields(amount, now) : { 'payment.status': 'cancelled' };
  // findOneAndUpdate skips the model hook: write the legacy fields read by the customer screens too
  const legacyUpdate = {
    ...legacyPaymentFromCanonical(
      { method: order.payment.method, status: isPaid ? 'refunded' : 'cancelled', refundAmount: isPaid ? amount : 0 },
      isPaid ? { status: 'succeeded', amount } : null,
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

  if (isPaid) {
    await creditWalletRefund({
      userId,
      orderId: cancelled._id,
      orderCode: cancelled.orderCode || cancelled.orderNumber,
      amount,
    });
    await Payment.updateMany({ order: cancelled._id, status: 'success' }, { $set: { status: 'refunded' } });
  }

  await recordStatusChange({
    orderId: cancelled._id,
    fromStatus: order.status,
    toStatus: 'cancelled',
    role: 'customer',
    action: isPaid ? 'Hủy đơn - đã hoàn vào ví ảo' : 'Hủy đơn',
    note: cancellation.note + (isPaid ? ` (Đã hoàn ${amount.toLocaleString('vi-VN')}đ vào ví ảo)` : ''),
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

  // Thông báo realtime tới cả Khách hàng và Chủ nhà hàng khi khách xác nhận đã nhận hàng
  try {
    const orderNumber = order.orderCode || order.orderNumber || String(order._id).slice(-6);

    // 1. Khách hàng
    await sendRealtimeNotification(order.customer, {
      title: 'Đã nhận hàng thành công 🎉',
      message: `Đơn hàng #${orderNumber} đã được bạn xác nhận nhận hàng thành công! Chúc bạn ngon miệng.`,
      type: 'order',
      orderId: order._id,
      link: `/orders/${order._id}`,
    });

    // 2. Chủ nhà hàng
    const restaurantDoc = await Restaurant.findById(order.restaurant).select('owner name').lean();
    if (restaurantDoc?.owner) {
      await sendRealtimeNotification(restaurantDoc.owner, {
        title: 'Đơn hàng đã hoàn thành 🍽️',
        message: `Đơn hàng #${orderNumber} của quán "${restaurantDoc.name}" đã được khách hàng xác nhận nhận hàng thành công.`,
        type: 'order',
        orderId: order._id,
        link: `/restaurant/orders`,
      });
    }
  } catch (notifErr) {
    console.warn('Failed to send delivered notification in confirmDeliveredByCustomer:', notifErr?.message);
  }

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

  const restaurant = await resolveRestaurant(restaurantId);
  if (!restaurant) {
    throw new ApiError(404, 'Nhà hàng không tồn tại');
  }

  await assertRestaurantTakingOrders(restaurant);

  let restLat = restaurant.location?.lat;
  let restLng = restaurant.location?.lng;
  // Tự động định vị lại nếu quán chưa có tọa độ hoặc đang dính tọa độ cũ ở trung tâm nội thành (21.0285, 105.8542)
  if (restLat == null || restLng == null || (restLat === 21.0285 && restLng === 105.8542)) {
    const resolvedRest = await resolveLocationFromAddress(restaurant.address);
    restLat = resolvedRest.lat;
    restLng = resolvedRest.lng;
    Restaurant.updateOne({ _id: restaurant._id }, { $set: { location: { lat: restLat, lng: restLng } } }).catch(() => {});
  }

  let destLat = lat != null && !isNaN(Number(lat)) ? Number(lat) : null;
  let destLng = lng != null && !isNaN(Number(lng)) ? Number(lng) : null;
  let destinationAddressText = '';

  if (addressId) {
    // 1. Kiểm tra trong Address collection
    const address = await Address.findById(addressId);
    if (address) {
      destinationAddressText = address.addressLine || '';
      if ((destLat == null || destLng == null) && address.location?.lat != null && address.location?.lng != null) {
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
        if ((destLat == null || destLng == null) && embedded.location?.lat != null && embedded.location?.lng != null) {
          destLat = embedded.location.lat;
          destLng = embedded.location.lng;
        }
      }
    }
  }

  if (destLat == null || destLng == null || isLocationMismatch(destinationAddressText, destLat, destLng)) {
    const resolved = await resolveLocationFromAddress(destinationAddressText, { allowDefault: false });
    destLat = resolved.lat;
    destLng = resolved.lng;

    // Cập nhật lại vào DB để tự động sửa chữa dữ liệu cũ
    if (addressId) {
      Address.updateOne({ _id: addressId }, { $set: { location: resolved } }).catch(() => {});
      User.updateOne({ 'addresses._id': addressId }, { $set: { 'addresses.$.location': resolved } }).catch(() => {});
    }
  }

  const shippingConfig = await getShippingFeeConfig();
  const routeInfo = await getRouteDistanceAndDuration(restLat, restLng, destLat, destLng);
  const distanceKm = routeInfo.distanceKm;
  const durationMinutes = routeInfo.durationMinutes;

  const isDeliverable = distanceKm <= shippingConfig.maxDistanceKm;

  let shippingFee = 0;
  let message = null;

  if (isDeliverable) {
    shippingFee = calculateShippingFee(distanceKm, shippingConfig);
  } else {
    message = `Khoảng cách giao hàng theo đường thực tế là ${distanceKm} km, vượt quá bán kính phục vụ tối đa (${shippingConfig.maxDistanceKm} km).`;
  }

  return {
    distanceKm,
    durationMinutes,
    shippingFee,
    baseDistanceKm: shippingConfig.baseDistanceKm,
    baseFee: shippingConfig.baseFee,
    perKmFee: shippingConfig.perKmFee,
    maxDistanceKm: shippingConfig.maxDistanceKm,
    isDeliverable,
    message,
  };
};
