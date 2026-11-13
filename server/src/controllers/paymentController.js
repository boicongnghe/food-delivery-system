import asyncHandler from '../utils/asyncHandler.js';
import * as paymentService from '../services/paymentService.js';

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
  const result = await paymentService.simulateWebhook(req.user, req.body);
  res.status(200).json({
    success: result.success !== false,
    data: result,
    message: result.message || 'Đã giả lập nhận biến động số dư SePay thành công',
  });
});
