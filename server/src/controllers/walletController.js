import asyncHandler from '../utils/asyncHandler.js';
import * as walletService from '../services/walletService.js';

const WITHDRAWAL_MESSAGES = {
  succeeded: 'Rút tiền thành công',
  processing: 'Đã gửi lệnh rút tiền, đang chờ ngân hàng xử lý',
  failed: 'Rút tiền không thành công, số tiền đã được hoàn lại vào ví',
};

export const getWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWallet(req.restaurant);

  res.status(200).json({ success: true, data: wallet, message: 'Lấy thông tin ví thành công' });
});

export const listWithdrawals = asyncHandler(async (req, res) => {
  const result = await walletService.listWithdrawals(req.restaurant, req.query);

  res.status(200).json({ success: true, data: result, message: 'Lấy lịch sử rút tiền thành công' });
});

export const updatePayoutAccount = asyncHandler(async (req, res) => {
  const restaurant = await walletService.updatePayoutAccount(req.restaurant, req.user._id, req.body);

  res.status(200).json({ success: true, data: restaurant, message: 'Đã lưu tài khoản nhận tiền' });
});

export const createWithdrawal = asyncHandler(async (req, res) => {
  const withdrawal = await walletService.requestWithdrawal(req.restaurant, req.user._id, req.body);

  res.status(201).json({ success: true, data: withdrawal, message: WITHDRAWAL_MESSAGES[withdrawal.status] });
});
