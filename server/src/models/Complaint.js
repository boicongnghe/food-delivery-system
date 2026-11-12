import mongoose from 'mongoose';
import { hearingSchema, penaltySchema } from './DeliveryIssue.js';

export const COMPLAINT_CATEGORIES = [
  'missing_item',
  'wrong_item',
  'food_quality',
  'late_delivery',
  'shipper_behavior',
  'payment',
  'other',
];
// open -> resolved (accepted, optional compensation) | rejected
export const COMPLAINT_STATUSES = ['open', 'resolved', 'rejected'];

const complaintSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // KN-0001
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true }, // one per order
    orderCode: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    category: { type: String, enum: COMPLAINT_CATEGORIES, required: true },
    description: { type: String, trim: true, maxlength: 1000, required: true },
    images: { type: [String], default: [] },

    status: { type: String, enum: COMPLAINT_STATUSES, default: 'open' },
    // Hearing: customer, restaurant and shipper (if any) talk it over before the admin penalizes anyone.
    // Same rules as delivery issues. Messages: hearing_messages
    hearing: { type: hearingSchema, default: null },
    resolution: {
      note: { type: String, default: '' }, // answer shown to the customer
      refundAmount: { type: Number, min: 0, default: 0 }, // simulated, no payment gateway yet
      // Party at fault (optional), counted in the same violation history as delivery issues
      penalty: { type: penaltySchema, default: null },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

complaintSchema.index({ status: 1, createdAt: -1 }); // admin list
complaintSchema.index({ customer: 1, createdAt: -1 }); // "Khiếu nại của tôi"
complaintSchema.index({ 'resolution.penalty.targetUser': 1 }); // violation history of an account
// Hearings of a party
complaintSchema.index({ restaurant: 1, 'hearing.openedAt': -1 });
complaintSchema.index({ shipper: 1, 'hearing.openedAt': -1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
