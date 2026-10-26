import asyncHandler from '../utils/asyncHandler.js';
import * as restaurantOrderService from '../services/restaurantOrderService.js';

export const getBoard = asyncHandler(async (req, res) => {
  const board = await restaurantOrderService.getBoard(req.restaurant._id);

  res.status(200).json({
    success: true,
    data: board,
    message: 'Lấy bảng đơn bếp thành công',
  });
});

export const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await restaurantOrderService.getOrderDetail(req.restaurant._id, req.params.id);

  res.status(200).json({
    success: true,
    data: order,
    message: 'Lấy chi tiết đơn hàng thành công',
  });
});

export const lookupOrder = asyncHandler(async (req, res) => {
  const result = await restaurantOrderService.findOrderIdByCode(req.restaurant._id, req.query.code);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Tìm thấy đơn hàng',
  });
});

export const acceptOrder = asyncHandler(async (req, res) => {
  const order = await restaurantOrderService.acceptOrder(req.restaurant._id, req.params.id);

  res.status(200).json({
    success: true,
    data: order,
    message: `Đã nhận đơn ${order.orderCode} – phiếu bếp #${String(order.kitchenTicketNo).padStart(2, '0')}`,
  });
});

export const rejectOrder = asyncHandler(async (req, res) => {
  const order = await restaurantOrderService.rejectOrder(req.restaurant._id, req.params.id, req.body);
  const refunded = order.payment.status === 'refunded';

  res.status(200).json({
    success: true,
    data: order,
    message: refunded
      ? `Đã từ chối đơn ${order.orderCode} và hoàn tiền cho khách`
      : `Đã từ chối đơn ${order.orderCode}`,
  });
});

export const markReady = asyncHandler(async (req, res) => {
  const order = await restaurantOrderService.markReady(req.restaurant._id, req.params.id);

  res.status(200).json({
    success: true,
    data: order,
    message: `Đơn ${order.orderCode} đã sẵn sàng, đang chờ shipper`,
  });
});
