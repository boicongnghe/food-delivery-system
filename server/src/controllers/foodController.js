import asyncHandler from '../utils/asyncHandler.js';
import * as foodService from '../services/foodService.js';

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
