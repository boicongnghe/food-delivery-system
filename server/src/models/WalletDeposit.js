import mongoose from 'mongoose';

export const WALLET_DEPOSIT_STATUSES = ['pending', 'completed'];

// A deposit request: the code the customer writes in the transfer content.
// The bank webhook credits the wallet of the user who owns the code, nobody else.
const walletDepositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Stored without spaces, upper case (e.g. NAPVI7KX2P9QA): banks may drop spaces from the content
    code: {
      type: String,
      required: true,
      unique: true,
    },
    // Amount shown on the QR; the wallet is credited with the amount actually received
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: WALLET_DEPOSIT_STATUSES,
      default: 'pending',
    },
    creditedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const WalletDeposit = mongoose.model('WalletDeposit', walletDepositSchema, 'wallet_deposits');

export default WalletDeposit;
