import ShippingFeeSetting, { SHIPPING_FEE_DEFAULTS } from '../models/ShippingFeeSetting.js';
import ApiError from '../utils/ApiError.js';

const CACHE_MS = 30 * 1000; // Cache 30 giây để tối ưu hiệu năng
let cache = { value: null, at: 0 };

const pickSettings = (doc) => ({
  baseDistanceKm: Number(doc?.baseDistanceKm ?? SHIPPING_FEE_DEFAULTS.baseDistanceKm),
  baseFee: Number(doc?.baseFee ?? SHIPPING_FEE_DEFAULTS.baseFee),
  perKmFee: Number(doc?.perKmFee ?? SHIPPING_FEE_DEFAULTS.perKmFee),
  maxDistanceKm: Number(doc?.maxDistanceKm ?? SHIPPING_FEE_DEFAULTS.maxDistanceKm),
});

/**
 * Lấy cấu hình giá cước giao hàng hiện tại (có cache ngắn hạn trong bộ nhớ)
 * Được dùng ở orderService, distance calculation và checkout
 */
export const getShippingFeeConfig = async () => {
  if (cache.value && Date.now() - cache.at < CACHE_MS) {
    return cache.value;
  }

  const doc = await ShippingFeeSetting.findById('default').lean();
  cache = {
    value: pickSettings(doc),
    at: Date.now(),
  };

  return cache.value;
};

/**
 * Lấy cấu hình đầy đủ kèm thông tin người chỉnh sửa cho trang Admin Dashboard
 */
export const getAdminShippingFeeSettings = async () => {
  const doc = await ShippingFeeSetting.findById('default').populate('updatedBy', 'fullName email').lean();

  return {
    values: pickSettings(doc),
    defaults: SHIPPING_FEE_DEFAULTS,
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updatedBy?.fullName || null,
  };
};

/**
 * Admin cập nhật cấu hình giá cước giao hàng & giới hạn khoảng cách
 */
export const updateShippingFeeSettings = async (adminId, data) => {
  const baseDistanceKm = Number(data.baseDistanceKm);
  const baseFee = Number(data.baseFee);
  const perKmFee = Number(data.perKmFee);
  const maxDistanceKm = Number(data.maxDistanceKm);

  if (isNaN(baseDistanceKm) || baseDistanceKm < 0) {
    throw new ApiError(400, 'Khoảng cách cơ bản phải là số lớn hơn hoặc bằng 0');
  }
  if (isNaN(baseFee) || baseFee < 0) {
    throw new ApiError(400, 'Cước phí cơ bản phải là số lớn hơn hoặc bằng 0');
  }
  if (isNaN(perKmFee) || perKmFee < 0) {
    throw new ApiError(400, 'Cước phí mỗi km tiếp theo phải là số lớn hơn hoặc bằng 0');
  }
  if (isNaN(maxDistanceKm) || maxDistanceKm <= baseDistanceKm) {
    throw new ApiError(400, `Bán kính giao hàng tối đa phải lớn hơn khoảng cách cơ bản (${baseDistanceKm} km)`);
  }

  const values = {
    baseDistanceKm,
    baseFee,
    perKmFee,
    maxDistanceKm,
    updatedBy: adminId,
  };

  await ShippingFeeSetting.findByIdAndUpdate(
    'default',
    { $set: values },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  // Xóa cache để áp dụng ngay lập tức cho các đơn hàng tiếp theo
  cache = { value: null, at: 0 };

  return getAdminShippingFeeSettings();
};

/**
 * Tính cước phí giao hàng theo cấu hình động
 * @param {number} distanceKm Khoảng cách thực tế (km)
 * @param {object} config Cấu hình giá cước
 * @returns {number} Cước phí vận chuyển (VNĐ)
 */
export const calculateDynamicShippingFee = (distanceKm, config = SHIPPING_FEE_DEFAULTS) => {
  const dist = Number(distanceKm) || 0;
  const maxDist = config.maxDistanceKm || SHIPPING_FEE_DEFAULTS.maxDistanceKm;
  const baseDist = config.baseDistanceKm || SHIPPING_FEE_DEFAULTS.baseDistanceKm;
  const baseFee = config.baseFee || SHIPPING_FEE_DEFAULTS.baseFee;
  const perKmFee = config.perKmFee || SHIPPING_FEE_DEFAULTS.perKmFee;

  if (dist > maxDist) {
    throw new ApiError(
      400,
      `Khoảng cách giao hàng theo đường thực tế là ${dist} km, vượt quá bán kính giao hàng tối đa cho phép (${maxDist} km). Vui lòng chọn địa chỉ khác gần hơn.`,
    );
  }

  if (dist <= baseDist) {
    return baseFee;
  }

  const extraKm = Math.ceil(dist - baseDist);
  return baseFee + extraKm * perKmFee;
};

