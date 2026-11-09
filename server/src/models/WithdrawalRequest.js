import mongoose from 'mongoose';

export const WITHDRAWAL_STATUSES = ['pending', 'completed', 'rejected'];

const withdrawalRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Số tiền rút là bắt buộc'],
      min: [10000, 'Số tiền rút tối thiểu là 10.000đ'],
    },
    bankInfo: {
      bankName: {
        type: String,
        required: [true, 'Tên ngân hàng là bắt buộc'],
        trim: true,
      },
      accountNumber: {
        type: String,
        required: [true, 'Số tài khoản là bắt buộc'],
        trim: true,
      },
      accountHolder: {
        type: String,
        required: [true, 'Tên chủ tài khoản là bắt buộc'],
        trim: true,
      },
    },
    status: {
      type: String,
      enum: WITHDRAWAL_STATUSES,
      default: 'pending',
      index: true,
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    processedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema, 'withdrawal_requests');

export default WithdrawalRequest;

