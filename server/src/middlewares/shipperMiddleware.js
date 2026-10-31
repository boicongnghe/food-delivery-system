import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import * as shipperOrderService from '../services/shipperOrderService.js';

const NOT_APPROVED_MESSAGES = {
  pending: 'Hồ sơ tài xế chưa được duyệt, chưa thể nhận đơn',
  rejected: 'Hồ sơ tài xế không được duyệt, không thể nhận đơn',
  suspended: 'Tài xế đang bị đình chỉ hoạt động, không thể nhận đơn mới',
};

// NEW deliveries need an approved shipper profile (admin approves / suspends it on the shipper page).
// Use after protect + authorize('shipper').
export const requireApprovedShipper = asyncHandler(async (req, res, next) => {
  const status = await shipperOrderService.getShipperStatus(req.user._id);
  if (status !== 'approved') {
    throw new ApiError(403, NOT_APPROVED_MESSAGES[status] || 'Tài khoản chưa có hồ sơ tài xế, chưa thể nhận đơn');
  }
  next();
});
