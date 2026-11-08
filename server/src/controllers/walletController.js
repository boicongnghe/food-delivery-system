import asyncHandler from '../utils/asyncHandler.js';
import * as walletService from '../services/walletService.js';

export const getMyWallet = asyncHandler(async (req, res) => {
  const data = await walletService.getMyWallet(req.user._id);
  res.status(200).json({
    success: true,
    data,
    message: 'Lấy thông tin ví ảo thành công',
  });
});

export const requestWithdrawal = asyncHandler(async (req, res) => {
  const withdrawal = await walletService.requestWithdrawal(req.user._id, req.body);
  res.status(201).json({
    success: true,
    data: withdrawal,
    message: 'Yêu cầu rút tiền đã được gửi thành công, vui lòng chờ quản trị viên xử lý',
  });
});

export const listWithdrawalsForAdmin = asyncHandler(async (req, res) => {
  const data = await walletService.listWithdrawalsForAdmin(req.query);
  res.status(200).json({
    success: true,
    data,
    message: 'Lấy danh sách yêu cầu rút tiền thành công',
  });
});

export const approveWithdrawal = asyncHandler(async (req, res) => {
  const data = await walletService.approveWithdrawal(req.user._id, req.params.id, req.body);
  res.status(200).json({
    success: true,
    data,
    message: 'Đã xác nhận chuyển khoản và hoàn tất yêu cầu rút tiền',
  });
});

export const rejectWithdrawal = asyncHandler(async (req, res) => {
  const data = await walletService.rejectWithdrawal(req.user._id, req.params.id, req.body);
  res.status(200).json({
    success: true,
    data,
    message: 'Đã từ chối yêu cầu và hoàn lại tiền vào ví ảo của khách hàng',
  });
});

