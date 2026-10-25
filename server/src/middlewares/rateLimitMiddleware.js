import rateLimit from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';

// Uploads are buffered in memory (max 5MB each), so limit how often one user can upload.
// Use after protect: the limit is counted per user, not per IP.
export const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  handler: (req, res, next) => {
    next(new ApiError(429, 'Bạn tải ảnh quá nhiều lần. Vui lòng thử lại sau ít phút.'));
  },
});

// Chặn Brute-Force đăng nhập: đếm số lần đăng nhập thất bại theo IP
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // Khung thời gian 15 phút
  limit: 5, // Tối đa 5 lần thử sai trong 15 phút
  skipSuccessfulRequests: true, // Đăng nhập thành công thì không tính vào giới hạn
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new ApiError(
        429,
        'Bạn đã thử đăng nhập thất bại quá nhiều lần liên tiếp. Để bảo vệ tài khoản, vui lòng thử lại sau 15 phút.'
      )
    );
  },
});

// Chống spam yêu cầu OTP quên mật khẩu
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 5, // Tối đa 5 yêu cầu trong 15 phút
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new ApiError(
        429,
        'Bạn đã yêu cầu gửi mã OTP quá nhiều lần. Vui lòng thử lại sau ít phút.'
      )
    );
  },
});
