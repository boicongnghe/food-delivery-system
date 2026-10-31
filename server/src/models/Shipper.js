import mongoose from 'mongoose';

const shipperSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    dateOfBirth: {
      type: String,
      required: true,
    },
    citizenId: {
      type: String,
      required: true,
    },
    vehicleInfo: {
      type: String,
      required: true,
    },
    vehicleRegistration: {
      fileName: { type: String, default: '' },
      fileData: { type: String, default: '' },
    },
    vehicleInsurance: {
      hasInsurance: { type: Boolean, default: false },
      submitLater: { type: Boolean, default: true },
      insuranceInfo: { type: String, default: '' },
      fileName: { type: String, default: '' },
      fileData: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'approved',
    },
    // Last admin decision on the status (reason of a rejection / suspension)
    statusChange: {
      note: { type: String, trim: true, maxlength: 500, default: '' },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 5.0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Shipper = mongoose.model('Shipper', shipperSchema, 'shippers');

export default Shipper;
