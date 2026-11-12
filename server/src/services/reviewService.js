import mongoose from 'mongoose';
import MenuItem from '../models/MenuItem.js';
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
export const recalculateRatings = async ({ restaurant, shipper, menuItemIds = [] }) => {
  if (restaurant) {
    const restaurantStats = await averageRating({ restaurant }, 'restaurantRating');
    await Restaurant.updateOne({ _id: restaurant }, { rating: restaurantStats.average, ratingCount: restaurantStats.count });
  }

  if (shipper) {
    const shipperStats = await averageRating({ shipper }, 'shipperRating');
    // Without visible ratings a shipper keeps the 5.0 default of the Shipper model
    await Shipper.updateOne({ user: shipper }, { rating: shipperStats.count ? shipperStats.average : 5 });
  }

  // Recalculate MenuItem dish ratings
  const uniqueItemIds = [...new Set((menuItemIds || []).map(String))].filter((id) => mongoose.isValidObjectId(id));
  for (const itemId of uniqueItemIds) {
    const objId = new mongoose.Types.ObjectId(itemId);
    const [stats] = await Review.aggregate([
      { $match: { isHidden: false, 'dishReviews.menuItem': objId } },
      { $unwind: '$dishReviews' },
      { $match: { 'dishReviews.menuItem': objId } },
      {
        $group: {
          _id: null,
          average: { $avg: '$dishReviews.rating' },
          count: { $sum: 1 },
        },
      },
    ]);
    const average = stats ? Math.round(stats.average * 10) / 10 : 5;
    const count = stats ? stats.count : 0;
    await MenuItem.updateOne({ _id: objId }, { rating: average, reviewsCount: count });
  }
};

// ---------- Customer (UC17) ----------

export const createReview = async (customerId, orderId, data) => {
  const order = await Order.findOne({ _id: orderId, customer: customerId })
    .select('orderCode status restaurant shipper statusHistory updatedAt items')
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

  // Build dish reviews: use submitted dishReviews if provided; otherwise generate from order items
  const submittedDishes = Array.isArray(data.dishReviews) ? data.dishReviews : [];
  const dishReviews = (order.items || [])
    .filter((item) => item.menuItem)
    .map((item) => {
      const match = submittedDishes.find((d) => String(d.menuItem) === String(item.menuItem));
      const optionsSummary = (item.options || []).map((o) => o.name).join(', ');
      return {
        menuItem: item.menuItem,
        food: item.food || null,
        dishName: item.name,
        dishImage: item.image || '',
        optionsSummary: match?.optionsSummary || optionsSummary,
        rating: match?.rating || data.restaurantRating,
        comment: match?.comment !== undefined ? match.comment : '',
      };
    });

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
    dishReviews,
  });

  const menuItemIds = dishReviews.map((d) => d.menuItem).filter(Boolean);
  await recalculateRatings({
    restaurant: review.restaurant,
    shipper: review.shipper,
    menuItemIds,
  });
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

  const menuItemIds = (review.dishReviews || []).map((d) => d.menuItem).filter(Boolean);
  await recalculateRatings({
    restaurant: review.restaurant,
    shipper: review.shipper,
    menuItemIds,
  });
  return getReviewDetail(reviewId);
};

// ---------- Dish Reviews (Shopee style - UC Verified Buyer Reviews) ----------

export const maskCustomerName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') return 'Khách hàng';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    const name = parts[0];
    if (name.length <= 2) return `${name[0]}*`;
    return `${name[0]}${'*'.repeat(Math.min(name.length - 2, 4))}${name[name.length - 1]}`;
  }
  const lastName = parts[0];
  const firstInitial = parts[1] ? parts[1][0] : '*';
  return `${lastName} ${firstInitial}. ***`;
};

export const getFoodReviews = async (foodId, { page = 1, limit = 10, rating = '', hasComment = false } = {}) => {
  if (!mongoose.isValidObjectId(foodId)) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }
  const foodObjectId = new mongoose.Types.ObjectId(foodId);

  // 1. Calculate overall stats for this dish from non-hidden reviews
  const statsAggregation = await Review.aggregate([
    { $match: { isHidden: false, 'dishReviews.menuItem': foodObjectId } },
    { $unwind: '$dishReviews' },
    { $match: { 'dishReviews.menuItem': foodObjectId } },
    {
      $group: {
        _id: null,
        average: { $avg: '$dishReviews.rating' },
        total: { $sum: 1 },
        stars5: { $sum: { $cond: [{ $eq: ['$dishReviews.rating', 5] }, 1, 0] } },
        stars4: { $sum: { $cond: [{ $eq: ['$dishReviews.rating', 4] }, 1, 0] } },
        stars3: { $sum: { $cond: [{ $eq: ['$dishReviews.rating', 3] }, 1, 0] } },
        stars2: { $sum: { $cond: [{ $eq: ['$dishReviews.rating', 2] }, 1, 0] } },
        stars1: { $sum: { $cond: [{ $eq: ['$dishReviews.rating', 1] }, 1, 0] } },
        withComment: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$dishReviews.comment', ''] }, { $ne: ['$dishReviews.comment', null] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const rawStats = statsAggregation[0] || {
    average: 5,
    total: 0,
    stars5: 0,
    stars4: 0,
    stars3: 0,
    stars2: 0,
    stars1: 0,
    withComment: 0,
  };

  const stats = {
    average: rawStats.total ? Math.round(rawStats.average * 10) / 10 : 5,
    total: rawStats.total,
    breakdown: {
      5: rawStats.stars5,
      4: rawStats.stars4,
      3: rawStats.stars3,
      2: rawStats.stars2,
      1: rawStats.stars1,
    },
    withComment: rawStats.withComment,
  };

  // 2. Build filtered aggregation for paginated reviews list
  const matchFilter = {
    isHidden: false,
    'dishReviews.menuItem': foodObjectId,
  };
  if (rating) {
    matchFilter['dishReviews.rating'] = Number(rating);
  }
  if (hasComment) {
    matchFilter['dishReviews.comment'] = { $gt: '' };
  }

  const pipeline = [
    { $match: { isHidden: false, 'dishReviews.menuItem': foodObjectId } },
    { $unwind: '$dishReviews' },
    { $match: matchFilter },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'customer',
        foreignField: '_id',
        as: 'customerInfo',
      },
    },
    {
      $project: {
        _id: '$dishReviews._id',
        reviewId: '$_id',
        orderId: '$order',
        orderCode: '$orderCode',
        rating: '$dishReviews.rating',
        comment: '$dishReviews.comment',
        optionsSummary: '$dishReviews.optionsSummary',
        dishName: '$dishReviews.dishName',
        createdAt: '$dishReviews.createdAt',
        customerName: { $arrayElemAt: ['$customerInfo.fullName', 0] },
        customerAvatar: { $arrayElemAt: ['$customerInfo.avatar', 0] },
      },
    },
  ];

  const countPipeline = [...pipeline, { $count: 'total' }];
  const [countResult] = await Review.aggregate(countPipeline);
  const totalItems = countResult?.total || 0;

  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(50, Number(limit) || 10));

  const itemsPipeline = [...pipeline, { $skip: (p - 1) * l }, { $limit: l }];
  const items = await Review.aggregate(itemsPipeline);

  const formattedItems = items.map((item) => ({
    _id: item._id,
    reviewId: item.reviewId,
    rating: item.rating,
    comment: item.comment || '',
    optionsSummary: item.optionsSummary || '',
    dishName: item.dishName,
    createdAt: item.createdAt,
    customerName: maskCustomerName(item.customerName),
    customerAvatar: item.customerAvatar || '',
    orderCode: item.orderCode,
    verifiedPurchase: true,
  }));

  return {
    stats,
    reviews: formattedItems,
    pagination: {
      page: p,
      limit: l,
      totalItems,
      totalPages: Math.ceil(totalItems / l) || 1,
    },
  };
};

export const getMyDishReviewStatus = async (customerId, foodId) => {
  if (!mongoose.isValidObjectId(foodId)) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }
  const foodObjectId = new mongoose.Types.ObjectId(foodId);

  // Delivered orders containing this menuItem
  const orders = await Order.find({
    customer: customerId,
    status: 'delivered',
    'items.menuItem': foodObjectId,
  })
    .sort({ updatedAt: -1 })
    .select('orderCode updatedAt items')
    .lean();

  if (orders.length === 0) {
    return {
      hasPurchased: false,
      canReview: false,
      alreadyReviewed: false,
      reviewableOrder: null,
      existingReview: null,
    };
  }

  // Check if any of these orders already has a review for this dish
  const orderIds = orders.map((o) => o._id);
  const existingReviews = await Review.find({
    order: { $in: orderIds },
    'dishReviews.menuItem': foodObjectId,
  }).lean();

  const reviewedOrderIds = new Set(existingReviews.map((r) => String(r.order)));
  const unreviewedOrder = orders.find((o) => !reviewedOrderIds.has(String(o._id)));

  if (unreviewedOrder) {
    const orderItem = unreviewedOrder.items.find((it) => String(it.menuItem) === String(foodId));
    return {
      hasPurchased: true,
      canReview: true,
      alreadyReviewed: false,
      reviewableOrder: {
        _id: unreviewedOrder._id,
        orderCode: unreviewedOrder.orderCode,
        deliveredAt: unreviewedOrder.updatedAt,
        optionsSummary: orderItem?.options?.map((o) => o.name).join(', ') || '',
      },
      existingReview: null,
    };
  }

  // Already reviewed
  const latestReview = existingReviews[0];
  const dishRev = latestReview?.dishReviews?.find((d) => String(d.menuItem) === String(foodId));

  return {
    hasPurchased: true,
    canReview: false,
    alreadyReviewed: true,
    reviewableOrder: null,
    existingReview: dishRev
      ? {
          rating: dishRev.rating,
          comment: dishRev.comment,
          createdAt: dishRev.createdAt || latestReview.createdAt,
        }
      : null,
  };
};

export const createDishReview = async (customerId, foodId, data) => {
  if (!mongoose.isValidObjectId(foodId)) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }
  const foodObjectId = new mongoose.Types.ObjectId(foodId);

  // Validate food exists
  const menuItem = await MenuItem.findById(foodObjectId).lean();
  if (!menuItem) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }

  // Find eligible delivered order
  let order;
  if (data.orderId && mongoose.isValidObjectId(data.orderId)) {
    order = await Order.findOne({
      _id: data.orderId,
      customer: customerId,
      status: 'delivered',
      'items.menuItem': foodObjectId,
    }).lean();
  } else {
    order = await Order.findOne({
      customer: customerId,
      status: 'delivered',
      'items.menuItem': foodObjectId,
    })
      .sort({ updatedAt: -1 })
      .lean();
  }

  if (!order) {
    throw new ApiError(403, 'Chỉ khách hàng đã đặt và nhận món ăn này thành công mới có thể gửi đánh giá.');
  }

  const orderItem = order.items.find((it) => String(it.menuItem) === String(foodId));
  const optionsSummary = orderItem?.options?.map((o) => o.name).join(', ') || '';

  // Check if review document exists for this order
  let review = await Review.findOne({ order: order._id });

  if (review) {
    const existingDishIdx = review.dishReviews.findIndex((d) => String(d.menuItem) === String(foodId));
    if (existingDishIdx >= 0) {
      review.dishReviews[existingDishIdx].rating = data.rating;
      review.dishReviews[existingDishIdx].comment = data.comment || '';
    } else {
      review.dishReviews.push({
        menuItem: foodObjectId,
        dishName: orderItem?.name || menuItem.name,
        dishImage: orderItem?.image || menuItem.image || '',
        optionsSummary,
        rating: data.rating,
        comment: data.comment || '',
      });
    }
    await review.save();
  } else {
    review = await Review.create({
      order: order._id,
      orderCode: order.orderCode,
      customer: customerId,
      restaurant: order.restaurant,
      shipper: order.shipper || null,
      restaurantRating: data.rating,
      comment: '',
      shipperRating: order.shipper ? 5 : null,
      shipperComment: '',
      dishReviews: [
        {
          menuItem: foodObjectId,
          dishName: orderItem?.name || menuItem.name,
          dishImage: orderItem?.image || menuItem.image || '',
          optionsSummary,
          rating: data.rating,
          comment: data.comment || '',
        },
      ],
    });
  }

  await recalculateRatings({
    restaurant: review.restaurant,
    shipper: review.shipper,
    menuItemIds: [foodObjectId],
  });

  return review;
};
