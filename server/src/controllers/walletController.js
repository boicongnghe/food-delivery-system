import asyncHandler from '../utils/asyncHandler.js';
import * as walletService from '../services/walletService.js';

/* ==========================================================================
   CUSTOMER VIRTUAL WALLET (Khách hàng)
   ========================================================================== */

export const getMyWallet = asyncHandler(async (req, res) => {
  const data = await walletService.getMyWallet(req.user._id);
  res.status(200).json({
    success: true,
    data,
    message: 'Lấy thông tin ví ảo thành công',
  });
});

export const requestWithdrawal = asyncHandler(async (req, res) => {
  const withdrawal = await walletService.requestCustomerWithdrawal(req.user._id, req.body);
  res.status(201).json({
    success: true,
    data: withdrawal,
    message: 'Yêu cầu rút tiền đã được gửi thành công, vui lòng chờ quản trị viên xử lý',
  });
});

export const createDeposit = asyncHandler(async (req, res) => {
  const data = await walletService.createDepositRequest(req.user._id, req.body);
  res.status(200).json({
    success: true,
    data,
    message: 'Tạo yêu cầu nạp tiền VietQR thành công',
  });
});

export const getDepositStatus = asyncHandler(async (req, res) => {
  const data = await walletService.getDepositStatus(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    data,
    message: 'Trạng thái yêu cầu nạp tiền',
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

/* ==========================================================================
   RESTAURANT WALLET (Nhà hàng)
   ========================================================================== */

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

export const addPayoutAccount = asyncHandler(async (req, res) => {
  const accounts = await walletService.addPayoutAccount(req.restaurant._id, req.user._id, req.body);
  res.status(201).json({ success: true, data: accounts, message: 'Đã thêm tài khoản ngân hàng' });
});

export const setDefaultPayoutAccount = asyncHandler(async (req, res) => {
  const accounts = await walletService.setDefaultPayoutAccount(req.restaurant._id, req.user._id, req.params.id);
  res.status(200).json({ success: true, data: accounts, message: 'Đã đặt làm tài khoản nhận tiền mặc định' });
});

export const removePayoutAccount = asyncHandler(async (req, res) => {
  const accounts = await walletService.removePayoutAccount(req.restaurant._id, req.params.id);
  res.status(200).json({ success: true, data: accounts, message: 'Đã xóa tài khoản ngân hàng' });
});

export const createWithdrawal = asyncHandler(async (req, res) => {
  const withdrawal = await walletService.requestRestaurantWithdrawal(req.restaurant, req.user._id, req.body);
  res.status(201).json({ success: true, data: withdrawal, message: WITHDRAWAL_MESSAGES[withdrawal.status] });
});
