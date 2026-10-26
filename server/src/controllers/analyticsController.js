import asyncHandler from '../utils/asyncHandler.js';
import * as analyticsService from '../services/analyticsService.js';

// UC44 - View analytics and reports
export const getAnalytics = asyncHandler(async (req, res) => {
  const report = await analyticsService.getAnalytics(req.query);

  res.status(200).json({
    success: true,
    data: report,
    message: 'Lấy báo cáo thống kê thành công',
  });
});
