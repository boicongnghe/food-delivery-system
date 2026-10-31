import asyncHandler from '../utils/asyncHandler.js';
import * as adminOrderService from '../services/adminOrderService.js';

// Platform orders (read only)

export const listOrders = asyncHandler(async (req, res) => {
  const result = await adminOrderService.listOrders(req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách đơn hàng thành công',
  });
});

export const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await adminOrderService.getOrderDetail(req.params.id);

  res.status(200).json({
    success: true,
    data: order,
    message: 'Lấy chi tiết đơn hàng thành công',
  });
});
