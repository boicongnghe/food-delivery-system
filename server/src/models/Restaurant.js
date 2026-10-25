import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    openingHours: {
      open: { type: String, default: '08:00' },
      close: { type: String, default: '22:00' },
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'approved',
    },
  },
  {
    timestamps: true,
    collection: 'restaurants',
  },
);

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
export default Restaurant;
