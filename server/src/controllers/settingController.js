import asyncHandler from '../utils/asyncHandler.js';
import * as settingService from '../services/settingService.js';

export const getOrderTimeouts = asyncHandler(async (req, res) => {
  const settings = await settingService.getOrderTimeoutSettings();

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Lấy cấu hình thời hạn xử lý đơn thành công',
  });
});

export const updateOrderTimeouts = asyncHandler(async (req, res) => {
  const settings = await settingService.updateOrderTimeouts(req.user._id, req.body);

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Đã lưu cấu hình, áp dụng cho các lần kiểm tra tiếp theo',
  });
});

export const getViolationPolicy = asyncHandler(async (req, res) => {
  const settings = await settingService.getViolationPolicySettings();

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Lấy cấu hình xử phạt vi phạm thành công',
  });
});

export const updateViolationPolicy = asyncHandler(async (req, res) => {
  const settings = await settingService.updateViolationPolicy(req.user._id, req.body);

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Đã lưu cấu hình, áp dụng cho các lần xử phạt tiếp theo',
  });
});
