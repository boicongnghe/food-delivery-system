import mongoose from 'mongoose';

/**
 * One wallet per restaurant. The balance itself is not stored: earnings come from the delivered orders
 * (same figures as the statement), this document only holds what limits a withdrawal:
 * - withdrawnTotal: sum of the withdrawals still processing or succeeded (a failed one is given back)
 * - weekStart / weekCount: withdrawals counted in the current Vietnam week (Monday - Sunday)
 * - version: every withdrawal request is a compare-and-set on it, so two requests at the same time can
 *   never spend the same money twice or go over the weekly limit
 */
const restaurantWalletSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true },
    withdrawnTotal: { type: Number, default: 0 },
    weekStart: { type: String, default: '' }, // "YYYY-MM-DD" Monday of the counted week
    weekCount: { type: Number, default: 0 },
    version: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'restaurant_wallets' },
);

const RestaurantWallet = mongoose.model('RestaurantWallet', restaurantWalletSchema);

export default RestaurantWallet;
