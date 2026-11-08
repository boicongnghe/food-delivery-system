import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Nhà riêng',
      trim: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'addresses',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

addressSchema.virtual('receiverName').get(function () {
  return this.recipientName;
});
addressSchema.virtual('receiverPhone').get(function () {
  return this.phone;
});
addressSchema.virtual('street').get(function () {
  return this.addressLine;
});

const Address = mongoose.model('Address', addressSchema);
export default Address;
