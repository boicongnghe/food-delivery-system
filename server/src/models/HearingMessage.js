import mongoose from 'mongoose';
import { HEARING_PARTIES } from './DeliveryIssue.js';

// Case types that can hold a hearing: delivery issue reports (UC45) and complaints (UC42)
export const HEARING_CASE_TYPES = ['delivery_issue', 'complaint'];
// URL segment of each case type: /api/hearings/<segment>/:id, /api/admin/<segment>/:id/hearing, ?type=<segment>
export const HEARING_CASE_SEGMENTS = { 'delivery-issues': 'delivery_issue', complaints: 'complaint' };
export const HEARING_MESSAGE_MAX_LENGTH = 1000;

// Message of a hearing: shipper, customer, restaurant owner or admin
const hearingMessageSchema = new mongoose.Schema(
  {
    caseType: { type: String, enum: HEARING_CASE_TYPES, required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, required: true }, // DeliveryIssue or Complaint
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    party: { type: String, enum: [...HEARING_PARTIES, 'admin'], required: true },
    message: { type: String, required: true, trim: true, maxlength: HEARING_MESSAGE_MAX_LENGTH },
  },
  { timestamps: true, collection: 'hearing_messages' },
);

hearingMessageSchema.index({ caseType: 1, caseId: 1, createdAt: 1 });

const HearingMessage = mongoose.model('HearingMessage', hearingMessageSchema);

export default HearingMessage;
