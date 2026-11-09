import asyncHandler from '../utils/asyncHandler.js';
import * as payoutAccountService from '../services/payoutAccountService.js';

// Bank accounts receiving the wallet withdrawals of the signed-in customer / shipper (/api/wallet/payout-accounts)

export const listPayoutAccounts = asyncHandler(async (req, res) => {
  const data = await payoutAccountService.listUserPayoutAccounts(req.user._id);
  res.status(200).json({ success: true, data, message: 'Lấy danh sách tài khoản ngân hàng thành công' });
});

export const addPayoutAccount = asyncHandler(async (req, res) => {
  const accounts = await payoutAccountService.addUserPayoutAccount(req.user._id, req.body);
  res.status(201).json({ success: true, data: accounts, message: 'Đã thêm tài khoản ngân hàng' });
});

export const setDefaultPayoutAccount = asyncHandler(async (req, res) => {
  const accounts = await payoutAccountService.setUserDefaultPayoutAccount(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: accounts, message: 'Đã đặt làm tài khoản nhận tiền mặc định' });
});

export const removePayoutAccount = asyncHandler(async (req, res) => {
  const accounts = await payoutAccountService.removeUserPayoutAccount(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: accounts, message: 'Đã xóa tài khoản ngân hàng' });
});
