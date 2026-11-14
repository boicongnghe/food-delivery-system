import mongoose from 'mongoose';

// requested -> completed (the admin transferred the money) | rejected (the amount went back to the earnings wallet)
export const SHIPPER_WITHDRAWAL_STATUSES = ['requested', 'completed', 'rejected'];

const shipperWithdrawalSchema = new mongoose.Schema(
  {
    shipper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    transactionCode: { type: String, required: true, unique: true },
    // Copy of the shipper's default payout account at request time (a later change never rewrites history)
    bankAccount: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
    },
    status: { type: String, enum: SHIPPER_WITHDRAWAL_STATUSES, default: 'requested', index: true },
    reference: { type: String, trim: true, default: '' }, // bank transfer reference, set on completion
    note: { type: String, trim: true, default: '' },
    rejectionReason: { type: String, trim: true, default: '' },
    processedAt: { type: Date, default: null },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

shipperWithdrawalSchema.index({ shipper: 1, createdAt: -1 });

const ShipperWithdrawal = mongoose.model('ShipperWithdrawal', shipperWithdrawalSchema);

export default ShipperWithdrawal;
