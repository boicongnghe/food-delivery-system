import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import * as restaurantService from '../services/restaurantService.js';

// Attach the logged-in owner's restaurant to req.restaurant (404 if no profile yet).
// Use after protect + authorize('restaurant_owner').
export const loadOwnerRestaurant = asyncHandler(async (req, res, next) => {
  req.restaurant = await restaurantService.getRestaurantByOwner(req.user._id);
  next();
});

// A suspended restaurant can still view its data but cannot change it.
// pending/rejected restaurants may keep preparing their menu while waiting for admin review.
export const requireEditableRestaurant = (req, res, next) => {
  if (req.method !== 'GET' && req.restaurant.status === 'suspended') {
    throw new ApiError(403, 'Nhà hàng đang bị tạm ngưng hoạt động, không thể thay đổi thực đơn');
  }
  next();
};
