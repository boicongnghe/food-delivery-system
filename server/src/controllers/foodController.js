import asyncHandler from '../utils/asyncHandler.js';
import * as foodService from '../services/foodService.js';
import * as reviewService from '../services/reviewService.js';

export const getFoods = asyncHandler(async (req, res) => {
  const foods = await foodService.getFoods(req.query);
  res.status(200).json({
    success: true,
    data: foods,
    message: 'Danh sách món ăn',
  });
});

export const getFoodById = asyncHandler(async (req, res) => {
  const food = await foodService.getFoodById(req.params.id);
  res.status(200).json({
    success: true,
    data: food,
    message: 'Chi tiết món ăn',
  });
});

export const getRestaurants = asyncHandler(async (req, res) => {
  const restaurants = await foodService.getRestaurants();
  res.status(200).json({
    success: true,
    data: restaurants,
    message: 'Danh sách nhà hàng',
  });
});

export const getFoodReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getFoodReviews(req.params.id, req.query);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Danh sách đánh giá món ăn',
  });
});

export const getMyDishReviewStatus = asyncHandler(async (req, res) => {
  const result = await reviewService.getMyDishReviewStatus(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Trạng thái đánh giá của bạn cho món này',
  });
});

export const createDishReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createDishReview(req.user._id, req.params.id, req.body);
  res.status(201).json({
    success: true,
    data: review,
    message: 'Đã gửi đánh giá món ăn thành công',
  });
});
