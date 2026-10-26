import mongoose from 'mongoose';

export const REVIEW_HIDE_REASONS = ['spam', 'offensive', 'irrelevant', 'personal_info', 'other'];

// One review per delivered order: rates the restaurant and, when the order had one, the shipper
const reviewSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    orderCode: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    restaurantRating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 500, default: '' },
    shipperRating: { type: Number, min: 1, max: 5, default: null },
    shipperComment: { type: String, trim: true, maxlength: 300, default: '' },

    // Hidden reviews are kept but no longer count in ratings
    isHidden: { type: Boolean, default: false },
    moderation: {
      reason: { type: String, enum: [...REVIEW_HIDE_REASONS, null], default: null },
      note: { type: String, default: '' },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

reviewSchema.index({ restaurant: 1, isHidden: 1 }); // restaurant rating
reviewSchema.index({ shipper: 1, isHidden: 1 }); // shipper rating
reviewSchema.index({ customer: 1, createdAt: -1 }); // "Đánh giá của tôi"
reviewSchema.index({ isHidden: 1, createdAt: -1 }); // admin moderation list

const Review = mongoose.model('Review', reviewSchema);

export default Review;
