import mongoose from 'mongoose';

// penalty: fine of a complaint / delivery issue taken from the wallet
export const TRANSACTION_TYPES = ['refund', 'withdraw', 'withdraw_rejected', 'deposit', 'payment', 'penalty'];
export const TRANSACTION_STATUSES = ['completed', 'pending', 'rejected'];

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    withdrawalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WithdrawalRequest',
      default: null,
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      default: 'completed',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // Bank transaction reference of a webhook credit: one bank transfer can be credited only once
    externalRef: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

// Partial (not sparse): only documents that carry a reference take part in the uniqueness
walletTransactionSchema.index(
  { externalRef: 1 },
  { unique: true, partialFilterExpression: { externalRef: { $type: 'string' } } },
);

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema, 'wallet_transactions');

export default WalletTransaction;

