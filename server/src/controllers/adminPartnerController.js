import asyncHandler from '../utils/asyncHandler.js';
import * as adminPartnerService from '../services/adminPartnerService.js';

// Restaurant and shipper management: list, review the registration, approve / reject / suspend / reopen

const STATUS_MESSAGES = {
  restaurant: {
    approved: 'Nhà hàng đã được phép hoạt động',
    rejected: 'Đã từ chối hồ sơ nhà hàng',
    suspended: 'Đã đình chỉ hoạt động của nhà hàng',
  },
  shipper: {
    approved: 'Tài xế đã được phép nhận đơn',
    rejected: 'Đã từ chối hồ sơ tài xế',
    suspended: 'Đã đình chỉ hoạt động của tài xế',
  },
};

export const listRestaurants = asyncHandler(async (req, res) => {
  const result = await adminPartnerService.listRestaurants(req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách nhà hàng thành công',
  });
});

export const getRestaurantDetail = asyncHandler(async (req, res) => {
  const restaurant = await adminPartnerService.getRestaurantDetail(req.params.id);

  res.status(200).json({
    success: true,
    data: restaurant,
    message: 'Lấy hồ sơ nhà hàng thành công',
  });
});

export const changeRestaurantStatus = asyncHandler(async (req, res) => {
  const restaurant = await adminPartnerService.changeRestaurantStatus(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: restaurant,
    message: STATUS_MESSAGES.restaurant[restaurant.status],
  });
});

export const listShippers = asyncHandler(async (req, res) => {
  const result = await adminPartnerService.listShippers(req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách tài xế thành công',
  });
});

export const getShipperDetail = asyncHandler(async (req, res) => {
  const shipper = await adminPartnerService.getShipperDetail(req.params.id);

  res.status(200).json({
    success: true,
    data: shipper,
    message: 'Lấy hồ sơ tài xế thành công',
  });
});

export const changeShipperStatus = asyncHandler(async (req, res) => {
  const shipper = await adminPartnerService.changeShipperStatus(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: shipper,
    message: STATUS_MESSAGES.shipper[shipper.status],
  });
});
