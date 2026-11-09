import mongoose from 'mongoose';

// processing -> succeeded | failed (a failed withdrawal gives the money and the weekly turn back)
export const WITHDRAWAL_STATUSES = ['processing', 'succeeded', 'failed'];
export const MIN_WITHDRAWAL_AMOUNT = 50000; // VND
export const MAX_WITHDRAWALS_PER_WEEK = 3;

// A restaurant moves money from its wallet to its bank account (docs/restaurant-wallet.md)
const restaurantWithdrawalSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // RT-0001, also the transfer reference at the gateway
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    // Copy of the payout account at request time: a later change never rewrites the history
    bankAccount: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
    },
    status: { type: String, enum: WITHDRAWAL_STATUSES, default: 'processing' },
    provider: { type: String, default: 'demo' }, // payout gateway that carried the transfer
    providerRef: { type: String, default: '' }, // transaction id returned by the gateway
    failureReason: { type: String, default: '' },
    completedAt: { type: Date, default: null },
    // Sent by the client once per withdrawal form: a double click or a retry never creates a second transfer
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true, collection: 'restaurant_withdrawals' },
);

restaurantWithdrawalSchema.index({ restaurant: 1, idempotencyKey: 1 }, { unique: true });
restaurantWithdrawalSchema.index({ restaurant: 1, createdAt: -1 });

const RestaurantWithdrawal = mongoose.model('RestaurantWithdrawal', restaurantWithdrawalSchema);

export default RestaurantWithdrawal;
