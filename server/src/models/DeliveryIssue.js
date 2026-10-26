import mongoose from 'mongoose';

export const DELIVERY_ISSUE_TYPES = [
  'customer_unreachable',
  'wrong_address',
  'customer_refused',
  'restaurant_delay',
  'damaged_items',
  'accident',
  'other',
];
// open -> resolved (handled, optional penalty) | dismissed (report not valid)
export const DELIVERY_ISSUE_STATUSES = ['open', 'resolved', 'dismissed'];
export const PENALTY_TARGETS = ['shipper', 'restaurant', 'customer'];
// warning, fine: recorded only (fine is simulated) | suspend: restaurant -> "suspended", shipper/customer -> account locked
export const PENALTY_ACTIONS = ['warning', 'fine', 'suspend'];

const penaltySchema = new mongoose.Schema(
  {
    target: { type: String, enum: PENALTY_TARGETS, required: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // account penalized
    action: { type: String, enum: PENALTY_ACTIONS, required: true },
    fineAmount: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

// Reported by the shipper of the order (UC34), handled by an admin (UC45)
const deliveryIssueSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // SC-0001
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderCode: { type: String, required: true },
    shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    type: { type: String, enum: DELIVERY_ISSUE_TYPES, required: true },
    description: { type: String, trim: true, maxlength: 1000, required: true },
    images: { type: [String], default: [] },

    status: { type: String, enum: DELIVERY_ISSUE_STATUSES, default: 'open' },
    resolution: {
      note: { type: String, default: '' },
      penalty: { type: penaltySchema, default: null },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

deliveryIssueSchema.index({ status: 1, createdAt: -1 }); // admin list
// One open report per order, also when two requests arrive at the same time
deliveryIssueSchema.index({ order: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });
deliveryIssueSchema.index({ 'resolution.penalty.targetUser': 1 }); // violation history of an account

const DeliveryIssue = mongoose.model('DeliveryIssue', deliveryIssueSchema);

export default DeliveryIssue;
