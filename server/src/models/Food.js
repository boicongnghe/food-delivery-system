import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
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
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'Món chính',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'foods',
  },
);

const Food = mongoose.model('Food', foodSchema);
export default Food;
