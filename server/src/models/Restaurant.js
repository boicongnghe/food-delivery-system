import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    open: { type: String, required: true }, // "HH:mm"
    close: { type: String, required: true }, // "HH:mm"
  },
  { _id: false },
);

const openingHourSchema = new mongoose.Schema(
  {
    // 0 = Sunday ... 6 = Saturday (same as Date.getDay())
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    isOpen: { type: Boolean, default: true },
    shifts: { type: [shiftSchema], default: [] },
  },
  { _id: false },
);

// Approval status of a partner profile (restaurant or shipper)
export const PARTNER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

const restaurantSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Tên nhà hàng là bắt buộc'],
      trim: true,
      maxlength: 60,
    },
    description: { type: String, trim: true, maxlength: 150, default: '' },
    address: {
      type: String,
      required: [true, 'Địa chỉ là bắt buộc'],
      trim: true,
    },
    location: {
      lat: { type: Number, default: 21.0285 },
      lng: { type: Number, default: 105.8542 },
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true,
    },
    categories: { type: [String], default: [] },
    logo: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    // No schedule = closed (TO-09). Shifts never cross midnight (decision D1, docs/order-timeouts.md)
    openingHours: { type: [openingHourSchema], default: [] },
    // Average minutes the kitchen needs (TO-04): sets the shipper handover time of every accepted order
    prepTime: { type: Number, min: 5, max: 120, default: 15 },
    // Owner's manual switch (no cook on duty, too many orders): false = no new orders, even inside opening hours
    isAcceptingOrders: { type: Boolean, default: true },
    acceptingOrdersChangedAt: { type: Date, default: null },
    ownerCitizenId: { type: String, default: '', trim: true },
    businessLicense: {
      fileName: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
      fileType: { type: String, default: '' },
      fileData: { type: String, default: '' },
      uploadedAt: { type: Date, default: Date.now },
    },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: PARTNER_STATUSES,
      default: 'pending',
    },
    // Last admin decision on the status (reason of a rejection / suspension)
    statusChange: {
      note: { type: String, trim: true, maxlength: 500, default: '' },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
    },
    // Bank account that receives the weekly settlement (shown masked in reports)
    payoutAccountChangedAt: { type: Date, default: null }, // last change from the wallet (audit)
    payoutAccount: {
      bankName: { type: String, trim: true, default: '' },
      accountNumber: { type: String, trim: true, default: '' },
      accountHolder: { type: String, trim: true, default: '' },
    },
  },
  { timestamps: true, collection: 'restaurants' },
);

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

export default Restaurant;
