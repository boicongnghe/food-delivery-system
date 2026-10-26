import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['banking', 'cod', 'momo'],
      required: true,
      default: 'banking',
    },
    transactionCode: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    failureReason: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
  },
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
