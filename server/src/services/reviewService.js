import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Review from '../models/Review.js';
import Shipper from '../models/Shipper.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';
import {
  FEEDBACK_ORDER_FIELDS,
  REVIEW_WINDOW_DAYS,
  closedSinceFilter,
  daysAgo,
  getStatusChangedAt,
  toFeedbackOrder,
} from './feedbackPolicy.js';

const averageRating = async (match, field) => {
  const [result] = await Review.aggregate([
    { $match: { ...match, isHidden: false, [field]: { $ne: null } } },
    { $group: { _id: null, average: { $avg: `$${field}` }, count: { $sum: 1 } } },
  ]);
  return result ? { average: Math.round(result.average * 10) / 10, count: result.count } : { average: 0, count: 0 };
};

// Recomputed from scratch after every create / hide / restore, so hidden reviews never count
export const recalculateRatings = async ({ restaurant, shipper }) => {
  const restaurantStats = await averageRating({ restaurant }, 'restaurantRating');
  await Restaurant.updateOne({ _id: restaurant }, { rating: restaurantStats.average, ratingCount: restaurantStats.count });

  if (shipper) {
    const shipperStats = await averageRating({ shipper }, 'shipperRating');
    // Without visible ratings a shipper keeps the 5.0 default of the Shipper model
    await Shipper.updateOne({ user: shipper }, { rating: shipperStats.count ? shipperStats.average : 5 });
  }
};

// ---------- Customer (UC17) ----------

export const createReview = async (customerId, orderId, data) => {
  const order = await Order.findOne({ _id: orderId, customer: customerId })
    .select('orderCode status restaurant shipper statusHistory updatedAt')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  if (order.status !== 'delivered') {
    throw new ApiError(409, 'Chỉ có thể đánh giá đơn hàng đã giao thành công');
  }
  if (getStatusChangedAt(order) < daysAgo(REVIEW_WINDOW_DAYS)) {
    throw new ApiError(409, `Đã quá hạn đánh giá (trong ${REVIEW_WINDOW_DAYS} ngày kể từ khi nhận hàng)`);
  }
  if (await Review.exists({ order: order._id })) {
    throw new ApiError(409, 'Bạn đã đánh giá đơn hàng này');
  }
  if (order.shipper && !data.shipperRating) {
    throw new ApiError(400, 'Dữ liệu không hợp lệ', [
      { field: 'shipperRating', message: 'Vui lòng chấm sao cho shipper' },
    ]);
  }

  const review = await Review.create({
    order: order._id,
    orderCode: order.orderCode,
    customer: customerId,
    restaurant: order.restaurant,
    shipper: order.shipper,
    restaurantRating: data.restaurantRating,
    comment: data.comment,
    shipperRating: order.shipper ? data.shipperRating : null,
    shipperComment: order.shipper ? data.shipperComment : '',
  });
  await recalculateRatings(review);
  return review;
};

export const listMyReviews = async (customerId, { page, limit }) => {
  const filter = { customer: customerId };
  const [items, totalItems] = await Promise.all([
    Review.find(filter)
      .populate('restaurant', 'name logo')
      .populate('shipper', 'fullName')
      // The customer sees why a review was hidden, not who hid it or the internal note
      .select('-moderation.by -moderation.note')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return toPage(items, { page, limit }, totalItems);
};

// Delivered orders still waiting for a review (newest first)
export const listReviewableOrders = async (customerId) => {
  const orders = await Order.find({
    customer: customerId,
    ...closedSinceFilter(['delivered'], daysAgo(REVIEW_WINDOW_DAYS)),
  })
    .populate('restaurant', 'name logo')
    .populate('shipper', 'fullName')
    .select(FEEDBACK_ORDER_FIELDS)
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  const reviewedIds = new Set(
    (await Review.find({ order: { $in: orders.map((order) => order._id) } }).distinct('order')).map(String),
  );
  return {
    windowDays: REVIEW_WINDOW_DAYS,
    items: orders
      .filter((order) => !reviewedIds.has(String(order._id)))
      .map((order) => toFeedbackOrder(order, REVIEW_WINDOW_DAYS)),
  };
};

// ---------- Admin moderation (UC43) ----------

const VISIBILITY_FILTERS = { all: {}, visible: { isHidden: false }, hidden: { isHidden: true } };

export const listReviews = async ({ page, limit, keyword, visibility, rating }) => {
  const baseFilter = {};
  if (rating) baseFilter.restaurantRating = rating;
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    baseFilter.$or = [{ orderCode: regex }, { comment: regex }, { shipperComment: regex }];
  }
  const filter = { ...baseFilter, ...VISIBILITY_FILTERS[visibility] };

  const [items, totalItems, groups] = await Promise.all([
    Review.find(filter)
      .populate('customer', 'fullName email avatar')
      .populate('restaurant', 'name')
      .populate('shipper', 'fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: baseFilter }, { $group: { _id: '$isHidden', count: { $sum: 1 } } }]),
  ]);

  const visible = groups.find((group) => group._id === false)?.count || 0;
  const hidden = groups.find((group) => group._id === true)?.count || 0;
  return { ...toPage(items, { page, limit }, totalItems), counts: { all: visible + hidden, visible, hidden } };
};

export const getReviewDetail = async (reviewId) => {
  const review = await Review.findById(reviewId)
    .populate('customer', 'fullName email phone avatar isActive')
    .populate('restaurant', 'name address rating ratingCount')
    .populate('shipper', 'fullName phone')
    .populate('order', 'orderCode items.name items.quantity total status createdAt')
    .populate('moderation.by', 'fullName')
    .lean();
  if (!review) {
    throw new ApiError(404, 'Không tìm thấy đánh giá');
  }
  return review;
};

// Conditional on the current state: a double click returns 409 instead of changing the review twice
export const setReviewVisibility = async (adminId, reviewId, { isHidden, reason, note }) => {
  const moderation = isHidden
    ? { reason, note, by: adminId, at: new Date() }
    : { reason: null, note: '', by: null, at: null };

  const review = await Review.findOneAndUpdate(
    { _id: reviewId, isHidden: !isHidden },
    { $set: { isHidden, moderation } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!review) {
    if (!(await Review.exists({ _id: reviewId }))) {
      throw new ApiError(404, 'Không tìm thấy đánh giá');
    }
    throw new ApiError(409, isHidden ? 'Đánh giá đã bị ẩn trước đó' : 'Đánh giá đang được hiển thị');
  }

  await recalculateRatings(review);
  return getReviewDetail(reviewId);
};
