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
