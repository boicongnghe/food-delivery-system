import asyncHandler from '../utils/asyncHandler.js';
import * as paymentService from '../services/paymentService.js';

export const processPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.processPayment(req.params.orderId, req.user._id, req.body);
  const statusCode = result.success ? 200 : 400;
  res.status(statusCode).json({
    success: result.success,
    data: result,
    message: result.message || result.failureReason || 'Xử lý thanh toán',
  });
});

export const retryPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.retryPayment(req.params.orderId, req.user._id, req.body);
  const statusCode = result.success ? 200 : 400;
  res.status(statusCode).json({
    success: result.success,
    data: result,
    message: result.message || result.failureReason || 'Xử lý thanh toán lại',
  });
});

export const getPaymentByOrder = asyncHandler(async (req, res) => {
  const payments = await paymentService.getPaymentByOrder(req.params.orderId);
  res.status(200).json({
    success: true,
    data: payments,
    message: 'Lịch sử thanh toán của đơn hàng',
  });
});

export const getPaymentQrInfo = asyncHandler(async (req, res) => {
  const data = await paymentService.getPaymentQrInfo(req.params.orderId, req.user._id);
  res.status(200).json({
    success: true,
    data,
    message: 'Thông tin VietQR động của đơn hàng',
  });
});

export const checkPaymentStatus = asyncHandler(async (req, res) => {
  const data = await paymentService.checkPaymentStatus(req.params.orderId, req.user._id);
  res.status(200).json({
    success: true,
    data,
    message: 'Trạng thái thanh toán của đơn hàng',
  });
});

export const handleSepayWebhook = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const result = await paymentService.handleSepayWebhook(req.body, authHeader);
  res.status(200).json(result);
});

export const simulateWebhook = asyncHandler(async (req, res) => {
  const result = await paymentService.simulateWebhook(req.body);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Đã giả lập nhận biến động số dư SePay thành công',
  });
});
