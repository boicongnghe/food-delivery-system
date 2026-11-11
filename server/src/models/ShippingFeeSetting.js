import mongoose from 'mongoose';

export const SHIPPING_FEE_DEFAULTS = {
  baseDistanceKm: 2,     // 2km đầu tiên
  baseFee: 15000,        // 15.000 VNĐ cho 2km đầu
  perKmFee: 5000,        // 5.000 VNĐ cho mỗi km tiếp theo
  maxDistanceKm: 10,     // Bán kính giao hàng tối đa 10km
};

const shippingFeeSettingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'default' },
    baseDistanceKm: { type: Number, min: 0, default: 2 },
    baseFee: { type: Number, min: 0, default: 15000 },
    perKmFee: { type: Number, min: 0, default: 5000 },
    maxDistanceKm: { type: Number, min: 1, default: 10 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'shipping_settings' },
);

const ShippingFeeSetting = mongoose.model('ShippingFeeSetting', shippingFeeSettingSchema);

export default ShippingFeeSetting;

