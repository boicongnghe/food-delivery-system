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
    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true,
    },
    categories: { type: [String], default: [] },
    logo: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    openingHours: { type: [openingHourSchema], default: [] },
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

export default Restaurant;
