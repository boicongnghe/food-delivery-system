import mongoose from 'mongoose';

export const VOUCHER_DISCOUNT_TYPES = ['percentage', 'fixed'];

/**
 * A promotion a restaurant runs with its own money (docs/restaurant-voucher.md). Different from the platform
 * codes (promotion_rules, admin): the discount is taken from the restaurant's net revenue.
 * Usage is counted from the real orders (placed, not cancelled), so a cancelled order gives its use back.
 */
const restaurantVoucherSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    code: { type: String, required: true, uppercase: true, trim: true }, // unique per restaurant
    title: { type: String, required: true, trim: true, maxlength: 60 },
    discountType: { type: String, enum: VOUCHER_DISCOUNT_TYPES, required: true },
    discountValue: { type: Number, required: true, min: 1 }, // percent (1-100) or VND
    maxDiscount: { type: Number, min: 0, default: null }, // cap of a percentage voucher
    minOrderValue: { type: Number, min: 0, default: 0 }, // food subtotal needed
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    usageLimit: { type: Number, min: 1, default: null }, // null = no total limit
    perCustomerLimit: { type: Number, min: 1, default: 1 },
    isActive: { type: Boolean, default: true }, // the owner can pause it at any time
  },
  { timestamps: true, collection: 'restaurant_vouchers' },
);

restaurantVoucherSchema.index({ restaurant: 1, code: 1 }, { unique: true });
restaurantVoucherSchema.index({ restaurant: 1, isActive: 1, endAt: 1 });

const RestaurantVoucher = mongoose.model('RestaurantVoucher', restaurantVoucherSchema);

export default RestaurantVoucher;
