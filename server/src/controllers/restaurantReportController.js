import asyncHandler from '../utils/asyncHandler.js';
import * as restaurantReportService from '../services/restaurantReportService.js';

export const getOverview = asyncHandler(async (req, res) => {
  const overview = await restaurantReportService.getOverview(req.restaurant, req.query);

  res.status(200).json({
    success: true,
    data: overview,
    message: 'Lấy báo cáo tổng quan thành công',
  });
});

export const listOrders = asyncHandler(async (req, res) => {
  const result = await restaurantReportService.listOrders(req.restaurant, req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy lịch sử đơn hàng thành công',
  });
});

export const exportOrders = asyncHandler(async (req, res) => {
  const result = await restaurantReportService.exportOrders(req.restaurant, req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy dữ liệu xuất báo cáo thành công',
  });
});

export const listReviews = asyncHandler(async (req, res) => {
  const result = await restaurantReportService.listReviews(req.restaurant, req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy đánh giá khách hàng thành công',
  });
});

export const getSettlements = asyncHandler(async (req, res) => {
  const result = await restaurantReportService.getSettlements(req.restaurant, req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy chi tiết hoa hồng thành công',
  });
});
