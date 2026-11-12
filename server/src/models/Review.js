import mongoose from 'mongoose';

export const REVIEW_HIDE_REASONS = ['spam', 'offensive', 'irrelevant', 'personal_info', 'other'];

const dishReviewSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', default: null },
    dishName: { type: String, required: true },
    dishImage: { type: String, default: '' },
    optionsSummary: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: true, timestamps: true },
);

// One review per delivered order: rates the restaurant, dishes and, when the order had one, the shipper
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

    // Per-dish reviews (Shopee style verified buyer reviews)
    dishReviews: { type: [dishReviewSchema], default: [] },

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
reviewSchema.index({ shipper: 1, isHidden: 1, createdAt: -1 }); // shipper rating by period
reviewSchema.index({ customer: 1, createdAt: -1 }); // "Đánh giá của tôi"
reviewSchema.index({ isHidden: 1, createdAt: -1 }); // admin moderation list
reviewSchema.index({ 'dishReviews.menuItem': 1, isHidden: 1, createdAt: -1 }); // dish reviews (Shopee style)

const Review = mongoose.model('Review', reviewSchema);

export default Review;
