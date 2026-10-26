import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Nhà riêng', trim: true },
    receiverName: { type: String, default: '', trim: true },
    receiverPhone: { type: String, default: '', trim: true },
    street: { type: String, required: true, trim: true },
    ward: { type: String, default: '', trim: true },
    district: { type: String, default: '', trim: true },
    city: { type: String, default: 'TP.HCM', trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Họ và tên là bắt buộc'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Email không đúng định dạng',
      ],
    },
    password: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['customer', 'restaurant_owner', 'shipper', 'admin'],
      default: 'customer',
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
    deliveryAddress: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Encrypt password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed or plaintext password
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (this.password === enteredPassword) {
    return true;
  }
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch {
    return false;
  }
};

const User = mongoose.model('User', userSchema, 'users');

export default User;
