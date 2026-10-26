import asyncHandler from '../utils/asyncHandler.js';
import * as reviewService from '../services/reviewService.js';

// ----- Customer (UC17) -----

export const createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user._id, req.params.id, req.body);

  res.status(201).json({
    success: true,
    data: review,
    message: 'Cảm ơn bạn đã đánh giá đơn hàng',
  });
});

export const listMyReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.listMyReviews(req.user._id, req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách đánh giá thành công',
  });
});

export const listReviewableOrders = asyncHandler(async (req, res) => {
  const result = await reviewService.listReviewableOrders(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách đơn chờ đánh giá thành công',
  });
});

// ----- Admin (UC43) -----

export const listReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.listReviews(req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách đánh giá thành công',
  });
});

export const getReviewDetail = asyncHandler(async (req, res) => {
  const review = await reviewService.getReviewDetail(req.params.id);

  res.status(200).json({
    success: true,
    data: review,
    message: 'Lấy chi tiết đánh giá thành công',
  });
});

export const setReviewVisibility = asyncHandler(async (req, res) => {
  const review = await reviewService.setReviewVisibility(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: review,
    message: review.isHidden ? 'Đã ẩn đánh giá vi phạm' : 'Đã hiển thị lại đánh giá',
  });
});
