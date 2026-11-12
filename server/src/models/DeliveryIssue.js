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
// Simulated fine (VND), shared by delivery issues and complaints
export const PENALTY_FINE_LIMITS = { min: 10000, max: 5000000 };
// none: the shipper keeps the order; release: back to the pool (not picked up yet); cancel: cancel + refund
export const ISSUE_ORDER_ACTIONS = ['none', 'release', 'cancel'];
// Parties invited to a hearing (free chat before a penalty, delivery issues and complaints); the admin writes there too
export const HEARING_PARTIES = ['shipper', 'customer', 'restaurant'];
export const HEARING_MAX_HOURS = 24;

export const penaltySchema = new mongoose.Schema(
  {
    target: { type: String, enum: PENALTY_TARGETS, required: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // account penalized
    action: { type: String, enum: PENALTY_ACTIONS, required: true },
    fineAmount: { type: Number, min: 0, default: 0 },
    // This penalty reached the violation threshold (ViolationSetting), so the account was suspended as well
    autoSuspended: { type: Boolean, default: false },
  },
  { _id: false },
);

export const hearingSchema = new mongoose.Schema(
  {
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    openedAt: { type: Date, required: true },
    deadline: { type: Date, required: true }, // at most HEARING_MAX_HOURS after openedAt
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedAt: { type: Date, default: null }, // closed early by an admin
    // Parties who had not written yet were reminded before the deadline (once per hearing)
    remindedAt: { type: Date, default: null },
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
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    waitedMinutes: { type: Number, min: 0, default: 0 },
    unansweredCalls: { type: Number, min: 0, default: 0 },
    images: { type: [String], default: [] },

    status: { type: String, enum: DELIVERY_ISSUE_STATUSES, default: 'open' },
    // Hearing: shipper, customer and restaurant talk it over before the admin penalizes anyone.
    // Open while the report is open, before the deadline and not closed by an admin. Messages: hearing_messages
    hearing: { type: hearingSchema, default: null },
    resolution: {
      note: { type: String, default: '' },
      penalty: { type: penaltySchema, default: null },
      // What the admin did with the order the shipper could not finish. Done on its own, before the decision
      orderAction: { type: String, enum: ISSUE_ORDER_ACTIONS, default: 'none' },
      orderActionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      orderActionAt: { type: Date, default: null },
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
// Hearings of a party
deliveryIssueSchema.index({ shipper: 1, 'hearing.openedAt': -1 });
deliveryIssueSchema.index({ customer: 1, 'hearing.openedAt': -1 });
deliveryIssueSchema.index({ restaurant: 1, 'hearing.openedAt': -1 });

const DeliveryIssue = mongoose.model('DeliveryIssue', deliveryIssueSchema);

export default DeliveryIssue;
