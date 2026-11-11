import asyncHandler from '../utils/asyncHandler.js';
import * as shippingFeeService from '../services/shippingFeeService.js';

export const getShippingFeeSettings = asyncHandler(async (req, res) => {
  const settings = await shippingFeeService.getAdminShippingFeeSettings();

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Lấy cấu hình giá cước giao hàng thành công',
  });
});

export const updateShippingFeeSettings = asyncHandler(async (req, res) => {
  const settings = await shippingFeeService.updateShippingFeeSettings(req.user._id, req.body);

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Đã cập nhật cấu hình giá cước giao hàng & giới hạn khoảng cách thành công',
  });
});

