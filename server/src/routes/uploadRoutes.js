import { Router } from 'express';
import ApiError from '../utils/ApiError.js';
import * as uploadController from '../controllers/uploadController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { uploadImage } from '../middlewares/uploadMiddleware.js';
import validate from '../middlewares/validate.js';
import { deleteUploadSchema, uploadQuerySchema } from '../validations/uploadValidation.js';

const router = Router();

router.use(protect);

// Allow avatars for all roles, require restaurant_owner for restaurant/menu items
const checkUploadPermission = (req, res, next) => {
  if (req.query.folder === 'avatars') {
    return next();
  }
  if (!['restaurant_owner', 'admin'].includes(req.user.role)) {
    throw new ApiError(403, 'Chỉ chủ quán mới có quyền tải ảnh nhà hàng và thực đơn');
  }
  next();
};

// POST /api/uploads/images?folder=restaurants|menu-items|avatars - multipart/form-data, field "image"
// Response data: { url, publicId }
router.post(
  '/images',
  uploadRateLimit,
  validate(uploadQuerySchema, 'query'),
  checkUploadPermission,
  uploadImage,
  uploadController.uploadImage,
);

// DELETE /api/uploads/images { url } - discard an uploaded image that was never saved
router.delete('/images', validate(deleteUploadSchema), uploadController.deleteUnusedImage);

export default router;
