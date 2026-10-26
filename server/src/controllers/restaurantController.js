import asyncHandler from '../utils/asyncHandler.js';
import * as restaurantService from '../services/restaurantService.js';

export const getMyRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.getRestaurantByOwner(req.user._id);

  res.status(200).json({
    success: true,
    data: restaurant,
    message: 'Lấy hồ sơ nhà hàng thành công',
  });
});

export const updateMyRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.upsertRestaurantByOwner(req.user._id, req.body);

  res.status(200).json({
    success: true,
    data: restaurant,
    message: 'Cập nhật hồ sơ nhà hàng thành công',
  });
});
