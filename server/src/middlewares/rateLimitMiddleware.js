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
