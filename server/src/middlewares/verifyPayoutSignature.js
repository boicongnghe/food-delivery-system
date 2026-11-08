import { isValidPayoutSignature } from '../services/payoutGateway.js';
import ApiError from '../utils/ApiError.js';

// The payout webhook is public: only a request signed with PAYOUT_WEBHOOK_SECRET (header x-payout-signature,
// hex HMAC-SHA256 of the raw body) may change a withdrawal
export const verifyPayoutSignature = (req, res, next) => {
  const secret = process.env.PAYOUT_WEBHOOK_SECRET;
  if (!secret) {
    return next(new ApiError(503, 'Webhook chi hộ chưa được cấu hình (thiếu PAYOUT_WEBHOOK_SECRET)'));
  }
  if (!req.rawBody || !isValidPayoutSignature(req.rawBody, req.get('x-payout-signature'), secret)) {
    return next(new ApiError(401, 'Chữ ký webhook không hợp lệ'));
  }
  return next();
};

export default verifyPayoutSignature;
