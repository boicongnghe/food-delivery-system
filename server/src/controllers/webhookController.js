import asyncHandler from '../utils/asyncHandler.js';
import * as walletService from '../services/walletService.js';

// Payout gateway callback. Always 200 once the withdrawal exists, also for a repeated delivery (changed: false),
// so the gateway stops retrying.
export const handlePayoutWebhook = asyncHandler(async (req, res) => {
  const { withdrawal, changed } = await walletService.applyPayoutResult(req.body);

  res.status(200).json({
    success: true,
    data: { reference: withdrawal.code, status: withdrawal.status, changed },
    message: changed ? 'Đã cập nhật kết quả rút tiền' : 'Lệnh rút tiền đã được xử lý trước đó',
  });
});
