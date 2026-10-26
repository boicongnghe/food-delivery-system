import asyncHandler from '../utils/asyncHandler.js';
import * as orderService from '../services/orderService.js';

export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user._id, req.body);
  res.status(201).json({
    success: true,
    data: order,
    message: 'Đặt đơn hàng thành công',
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user._id);
  res.status(200).json({
    success: true,
    data: order,
    message: 'Chi tiết đơn hàng',
  });
});

export const getCustomerOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getCustomerOrders(req.user._id, req.query);
  res.status(200).json({
    success: true,
    data: orders,
    message: 'Danh sách đơn hàng của bạn',
  });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await orderService.cancelOrder(req.params.id, req.user._id, reason);
  res.status(200).json({
    success: true,
    data: order,
    message: order.refundStatus === 'refunded' ? 'Hủy đơn hàng và hoàn tiền thành công' : 'Hủy đơn hàng thành công',
  });
});

export const receiveOrder = asyncHandler(async (req, res) => {
  const order = await orderService.receiveOrder(req.params.id, req.user._id);
  res.status(200).json({
    success: true,
    data: order,
    message: 'Xác nhận đã nhận đơn hàng thành công',
  });
});

export const progressOrder = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await orderService.progressOrderStatus(req.params.id, status, note);
  res.status(200).json({
    success: true,
    data: order,
    message: `Đã cập nhật tiến độ đơn hàng sang ${status}`,
  });
});
