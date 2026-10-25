import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import * as restaurantService from '../services/restaurantService.js';

// Attach the logged-in owner's restaurant to req.restaurant (404 if no profile yet).
// Use after protect + authorize('restaurant_owner').
export const loadOwnerRestaurant = asyncHandler(async (req, res, next) => {
  req.restaurant = await restaurantService.getRestaurantByOwner(req.user._id);
  next();
});

// MENU: a suspended restaurant can still view its data but cannot change it.
// pending/rejected restaurants may keep preparing their menu while waiting for admin review.
export const requireEditableRestaurant = (req, res, next) => {
  if (req.method !== 'GET' && req.restaurant.status === 'suspended') {
    throw new ApiError(403, 'Nhà hàng đang bị tạm ngưng hoạt động, không thể thay đổi thực đơn');
  }
  next();
};

const NOT_APPROVED_MESSAGES = {
  pending: 'Nhà hàng chưa được duyệt, chưa thể nhận đơn mới',
  rejected: 'Nhà hàng không được duyệt hoạt động, không thể nhận đơn mới',
  suspended: 'Nhà hàng đang bị tạm ngưng hoạt động, không thể nhận đơn mới',
};

// ORDERS: only an approved restaurant may accept NEW orders.
// Orders already on the board can still be rejected (refund) or finished whatever the status,
// so customers are never stuck when a restaurant gets suspended.
export const requireApprovedRestaurant = (req, res, next) => {
  if (req.restaurant.status !== 'approved') {
    throw new ApiError(403, NOT_APPROVED_MESSAGES[req.restaurant.status] || 'Nhà hàng chưa thể nhận đơn mới');
  }
  next();
};
