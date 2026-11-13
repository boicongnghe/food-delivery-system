import asyncHandler from '../utils/asyncHandler.js';
import * as adminOrderService from '../services/adminOrderService.js';

// Platform orders: read, and record the result of a refund transfer

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

export const resolveRefund = asyncHandler(async (req, res) => {
  const order = await adminOrderService.resolveRefund(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: order,
    message: req.body.result === 'succeeded' ? 'Đã xác nhận hoàn tiền cho khách' : 'Đã ghi nhận hoàn tiền chưa thành công',
  });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await adminOrderService.cancelOrderAsAdmin(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: order,
    message: 'Đã hủy đơn thay khách hàng',
  });
});

export const releaseShipper = asyncHandler(async (req, res) => {
  const order = await adminOrderService.releaseShipperAsAdmin(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: order,
    message: 'Đã trả đơn về hàng chờ để shipper khác nhận',
  });
});
