import mongoose from 'mongoose';
import { HEARING_PARTIES } from './DeliveryIssue.js';

// Message of a delivery issue hearing: shipper, customer, restaurant owner or admin
const issueMessageSchema = new mongoose.Schema(
  {
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryIssue', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    party: { type: String, enum: [...HEARING_PARTIES, 'admin'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true, collection: 'issue_messages' },
);

issueMessageSchema.index({ issue: 1, createdAt: 1 });

const IssueMessage = mongoose.model('IssueMessage', issueMessageSchema);

export default IssueMessage;
