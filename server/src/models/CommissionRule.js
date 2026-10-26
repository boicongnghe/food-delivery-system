import mongoose from 'mongoose';

export const COMMISSION_TARGETS = ['restaurant', 'shipper'];

/**
 * Platform commission in percent:
 * - restaurant: of the food subtotal. restaurant = null is the default for every restaurant;
 *   a rule for one restaurant overrides the default for that restaurant.
 * - shipper: of the shipping fee (always for every shipper, restaurant = null).
 * Periods are Vietnam calendar days "YYYY-MM-DD", both inclusive; effectiveTo = null means no end date.
 */
const commissionRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    target: { type: String, enum: COMMISSION_TARGETS, required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    rate: { type: Number, required: true, min: 0, max: 100 },
    effectiveFrom: { type: String, required: true },
    effectiveTo: { type: String, default: null },
    note: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true },
);

commissionRuleSchema.index({ target: 1, restaurant: 1, effectiveFrom: 1 });

const CommissionRule = mongoose.model('CommissionRule', commissionRuleSchema);

export default CommissionRule;
