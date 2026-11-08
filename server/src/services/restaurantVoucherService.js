import Order from '../models/Order.js';
import RestaurantVoucher from '../models/RestaurantVoucher.js';
import ApiError from '../utils/ApiError.js';
import { PLACED_ORDER_FILTER } from './orderPolicy.js';

/**
 * Restaurant vouchers (docs/restaurant-voucher.md): promotions a restaurant runs with its own money.
 * - At most one restaurant voucher + one platform voucher per order; the restaurant one is applied first.
 * - A use = a real order (placed, not cancelled) with the voucher. A cancelled order or an online checkout
 *   that was never paid gives the use back, without touching any cancellation flow.
 * - Limits are checked when the order is created. Orders placed in the very same second may go one or two
 *   uses over usageLimit (accepted trade-off of counting uses instead of reserving them).
 */

const COUNTED_USE = { ...PLACED_ORDER_FILTER, status: { $ne: 'cancelled' } };
const DUPLICATE_KEY = 11000;

const fieldError = (status, field, message) => new ApiError(status, message, [{ field, message }]);

// 15000 -> "15K", 15500 -> "15.500đ"
const formatShort = (amount) => (amount % 1000 === 0 ? `${amount / 1000}K` : `${amount.toLocaleString('vi-VN')}đ`);

export const voucherLabel = (voucher) => {
  const discount =
    voucher.discountType === 'percentage'
      ? `Giảm ${voucher.discountValue}%${voucher.maxDiscount ? ` tối đa ${formatShort(voucher.maxDiscount)}` : ''}`
      : `Giảm ${formatShort(voucher.discountValue)}`;
  return voucher.minOrderValue > 0 ? `${discount} đơn từ ${formatShort(voucher.minOrderValue)}` : discount;
};

export const computeVoucherDiscount = (voucher, subtotal) => {
  const raw =
    voucher.discountType === 'percentage'
      ? Math.round((subtotal * voucher.discountValue) / 100)
      : voucher.discountValue;
  const capped = voucher.discountType === 'percentage' && voucher.maxDiscount ? Math.min(raw, voucher.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
};

const statusOf = (voucher, used, now = new Date()) => {
  if (!voucher.isActive) return 'paused';
  if (voucher.endAt < now) return 'ended';
  if (voucher.startAt > now) return 'upcoming';
  if (voucher.usageLimit && used >= voucher.usageLimit) return 'exhausted';
  return 'running';
};

// { voucherId -> { used, spent } }: spent = discount of the delivered orders (the money really given away)
const loadUsage = async (voucherIds) => {
  if (voucherIds.length === 0) return new Map();
  const groups = await Order.aggregate([
    { $match: { 'restaurantVoucher.voucher': { $in: voucherIds }, ...COUNTED_USE } },
    {
      $group: {
        _id: '$restaurantVoucher.voucher',
        used: { $sum: 1 },
        spent: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$restaurantVoucher.discountAmount', 0] } },
      },
    },
  ]);
  return new Map(groups.map((group) => [String(group._id), { used: group.used, spent: group.spent }]));
};

const toOwnerView = (voucher, usage = { used: 0, spent: 0 }) => ({
  _id: voucher._id,
  code: voucher.code,
  title: voucher.title,
  discountType: voucher.discountType,
  discountValue: voucher.discountValue,
  maxDiscount: voucher.maxDiscount,
  minOrderValue: voucher.minOrderValue,
  startAt: voucher.startAt,
  endAt: voucher.endAt,
  usageLimit: voucher.usageLimit,
  perCustomerLimit: voucher.perCustomerLimit,
  isActive: voucher.isActive,
  label: voucherLabel(voucher),
  used: usage.used,
  spent: usage.spent,
  status: statusOf(voucher, usage.used),
  createdAt: voucher.createdAt,
});

const toPublicView = (voucher) => ({
  code: voucher.code,
  title: voucher.title,
  discountType: voucher.discountType,
  discountValue: voucher.discountValue,
  maxDiscount: voucher.maxDiscount,
  minOrderValue: voucher.minOrderValue,
  endAt: voucher.endAt,
  label: voucherLabel(voucher),
});

const findOwnVoucher = async (restaurantId, voucherId) => {
  const voucher = await RestaurantVoucher.findOne({ _id: voucherId, restaurant: restaurantId });
  if (!voucher) {
    throw new ApiError(404, 'Không tìm thấy mã giảm giá');
  }
  return voucher;
};

const rethrowDuplicateCode = (error) => {
  if (error.code === DUPLICATE_KEY) {
    throw fieldError(409, 'code', 'Quán đã có mã giảm giá trùng mã này');
  }
  throw error;
};

// ---------- Owner (Khuyến mãi page)

export const listVouchers = async (restaurantId) => {
  const vouchers = await RestaurantVoucher.find({ restaurant: restaurantId }).sort({ createdAt: -1 }).lean();
  const usage = await loadUsage(vouchers.map((voucher) => voucher._id));
  const items = vouchers.map((voucher) => toOwnerView(voucher, usage.get(String(voucher._id))));
  return {
    items,
    summary: {
      running: items.filter((item) => item.status === 'running').length,
      totalUsed: items.reduce((sum, item) => sum + item.used, 0),
      totalSpent: items.reduce((sum, item) => sum + item.spent, 0),
    },
  };
};

export const createVoucher = async (restaurantId, data) => {
  try {
    const voucher = await RestaurantVoucher.create({ ...data, restaurant: restaurantId });
    return toOwnerView(voucher.toObject());
  } catch (error) {
    return rethrowDuplicateCode(error);
  }
};

// Orders keep their own copy of the discount: editing a voucher never changes orders already placed
export const updateVoucher = async (restaurantId, voucherId, data) => {
  const voucher = await findOwnVoucher(restaurantId, voucherId);
  const usage = (await loadUsage([voucher._id])).get(String(voucher._id)) || { used: 0, spent: 0 };
  if (data.usageLimit && data.usageLimit < usage.used) {
    throw fieldError(400, 'usageLimit', `Tổng lượt dùng không được nhỏ hơn số lượt đã dùng (${usage.used})`);
  }
  voucher.set(data);
  try {
    await voucher.save();
  } catch (error) {
    rethrowDuplicateCode(error);
  }
  return toOwnerView(voucher.toObject(), usage);
};

export const setVoucherActive = async (restaurantId, voucherId, isActive) => {
  const voucher = await RestaurantVoucher.findOneAndUpdate(
    { _id: voucherId, restaurant: restaurantId },
    { $set: { isActive } },
    { returnDocument: 'after' },
  ).lean();
  if (!voucher) {
    throw new ApiError(404, 'Không tìm thấy mã giảm giá');
  }
  const usage = (await loadUsage([voucher._id])).get(String(voucher._id));
  return toOwnerView(voucher, usage);
};

// A voucher already used by an order stays as history: pause it or end it instead
export const deleteVoucher = async (restaurantId, voucherId) => {
  const voucher = await findOwnVoucher(restaurantId, voucherId);
  if (await Order.exists({ 'restaurantVoucher.voucher': voucher._id })) {
    throw new ApiError(409, 'Mã đã được dùng trong đơn hàng nên không xóa được. Hãy tạm dừng hoặc kết thúc chương trình.');
  }
  await voucher.deleteOne();
};

// ---------- Customers (storefront, checkout)

const runningFilter = (now) => ({ isActive: true, startAt: { $lte: now }, endAt: { $gte: now } });

// Vouchers a customer can pick for this restaurant right now (used-up ones left out)
export const listRunningVouchers = async (restaurantId) => {
  const now = new Date();
  const vouchers = await RestaurantVoucher.find({ restaurant: restaurantId, ...runningFilter(now) }).sort({ endAt: 1 }).lean();
  const usage = await loadUsage(vouchers.map((voucher) => voucher._id));
  return vouchers
    .filter((voucher) => statusOf(voucher, usage.get(String(voucher._id))?.used || 0, now) === 'running')
    .map(toPublicView);
};

// Storefront badge: the best running voucher of each restaurant { restaurantId -> label }
export const getVoucherHighlights = async (restaurantIds) => {
  const now = new Date();
  const vouchers = await RestaurantVoucher.find({ restaurant: { $in: restaurantIds }, ...runningFilter(now) }).lean();
  const usage = await loadUsage(vouchers.map((voucher) => voucher._id));
  const highlights = new Map();
  for (const voucher of vouchers) {
    if (statusOf(voucher, usage.get(String(voucher._id))?.used || 0, now) !== 'running') continue;
    const key = String(voucher.restaurant);
    // Lowest minimum order first: the easiest deal to get is the most attractive one to show
    const current = highlights.get(key);
    if (!current || voucher.minOrderValue < current.minOrderValue) highlights.set(key, voucher);
  }
  return new Map([...highlights].map(([key, voucher]) => [key, voucherLabel(voucher)]));
};

/**
 * Checks a restaurant voucher for an order and computes its discount (checkout preview and order creation).
 * @returns {Promise<{ voucher: object, discountAmount: number }>}
 */
export const resolveVoucherForOrder = async ({ restaurantId, code, subtotal, customerId }) => {
  const now = new Date();
  const voucher = await RestaurantVoucher.findOne({ restaurant: restaurantId, code: String(code).trim().toUpperCase() }).lean();
  if (!voucher) {
    throw fieldError(400, 'restaurantVoucherCode', 'Mã giảm giá của quán không tồn tại');
  }
  if (!voucher.isActive) {
    throw fieldError(400, 'restaurantVoucherCode', 'Chương trình giảm giá này đang tạm dừng');
  }
  if (voucher.startAt > now || voucher.endAt < now) {
    throw fieldError(400, 'restaurantVoucherCode', 'Mã giảm giá của quán chưa bắt đầu hoặc đã hết hạn');
  }
  if (subtotal < voucher.minOrderValue) {
    throw fieldError(
      400,
      'restaurantVoucherCode',
      `Đơn cần tiền món tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')}đ để dùng mã ${voucher.code}`,
    );
  }

  const [totalUsed, customerUsed] = await Promise.all([
    voucher.usageLimit ? Order.countDocuments({ 'restaurantVoucher.voucher': voucher._id, ...COUNTED_USE }) : 0,
    customerId ? Order.countDocuments({ 'restaurantVoucher.voucher': voucher._id, customer: customerId, ...COUNTED_USE }) : 0,
  ]);
  if (voucher.usageLimit && totalUsed >= voucher.usageLimit) {
    throw fieldError(400, 'restaurantVoucherCode', 'Mã giảm giá của quán đã hết lượt sử dụng');
  }
  if (customerUsed >= voucher.perCustomerLimit) {
    throw fieldError(400, 'restaurantVoucherCode', `Bạn đã dùng hết ${voucher.perCustomerLimit} lượt của mã này`);
  }

  return { voucher, discountAmount: computeVoucherDiscount(voucher, subtotal) };
};
