import { Router } from 'express';
import * as uploadController from '../controllers/uploadController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { uploadImage } from '../middlewares/uploadMiddleware.js';
import validate from '../middlewares/validate.js';
import { deleteUploadSchema, uploadQuerySchema } from '../validations/uploadValidation.js';

const router = Router();

// Only restaurant owners upload images for now (restaurant profile + menu).
// Add roles here when other modules need uploads (e.g. avatars).
router.use(protect, authorize('restaurant_owner'));

// POST /api/uploads/images?folder=restaurants|menu-items - multipart/form-data, field "image"
// Response data: { url, publicId }
router.post(
  '/images',
  uploadRateLimit,
  validate(uploadQuerySchema, 'query'),
  uploadImage,
  uploadController.uploadImage,
);

// DELETE /api/uploads/images { url } - discard an uploaded image that was never saved
router.delete('/images', validate(deleteUploadSchema), uploadController.deleteUnusedImage);

export default router;
