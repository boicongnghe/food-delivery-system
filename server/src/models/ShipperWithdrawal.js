import mongoose from 'mongoose';

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
    status: { type: String, enum: ['requested'], default: 'requested' },
  },
  { timestamps: true },
);

shipperWithdrawalSchema.index({ shipper: 1, createdAt: -1 });

const ShipperWithdrawal = mongoose.model('ShipperWithdrawal', shipperWithdrawalSchema);

export default ShipperWithdrawal;
