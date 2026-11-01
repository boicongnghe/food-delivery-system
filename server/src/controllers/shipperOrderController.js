import asyncHandler from '../utils/asyncHandler.js';
import * as shipperOrderService from '../services/shipperOrderService.js';

export const listAvailableForPickup = asyncHandler(async (req, res) => {
  const result = await shipperOrderService.listAvailableForPickup(req.user._id, req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách đơn chờ shipper thành công',
  });
});

export const getAvailableOrderDetail = asyncHandler(async (req, res) => {
  const data = await shipperOrderService.getAvailableOrderDetail(
    req.user._id,
    req.params.id,
  );
  res.status(200).json({ success: true, data, message: 'Lấy chi tiết đơn giao hàng thành công' });
});

export const getActiveOrders = asyncHandler(async (req, res) => {
  const data = await shipperOrderService.getActiveOrders(req.user._id);
  res.status(200).json({ success: true, data, message: 'Lấy đơn giao hàng đang thực hiện thành công' });
});

export const acceptOrder = asyncHandler(async (req, res) => {
  const data = await shipperOrderService.acceptOrder(req.user._id, req.params.id);
  res.status(200).json({ success: true, data, message: 'Đã nhận đơn giao hàng' });
});

export const cancelAcceptance = asyncHandler(async (req, res) => {
  const data = await shipperOrderService.cancelAcceptance(req.user._id, req.params.id);
  res.status(200).json({ success: true, data, message: 'Đã trả đơn về danh sách chờ nhận' });
});

export const confirmPickup = asyncHandler(async (req, res) => {
  const data = await shipperOrderService.confirmPickup(req.user._id, req.params.id);
  res.status(200).json({ success: true, data, message: 'Đã xác nhận lấy hàng' });
});

export const startCustomerWait = asyncHandler(async (req, res) => {
  const data = await shipperOrderService.startCustomerWait(req.user._id, req.params.id);
  res.status(200).json({ success: true, data, message: 'Đã bắt đầu tính thời gian chờ khách' });
});

export const recordUnansweredCall = asyncHandler(async (req, res) => {
  const data = await shipperOrderService.recordUnansweredCall(req.user._id, req.params.id);
  res.status(200).json({ success: true, data, message: 'Đã ghi nhận cuộc gọi không được trả lời' });
});

export const confirmDelivered = asyncHandler(async (req, res) => {
  const result = await shipperOrderService.confirmDelivered(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    data: result,
    message: `Đã xác nhận giao hàng, ${result.payout.toLocaleString('vi-VN')}đ được cộng vào số dư chờ`,
  });
});
