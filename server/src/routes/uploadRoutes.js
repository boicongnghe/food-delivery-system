import { Router } from 'express';
import * as uploadController from '../controllers/uploadController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadImage } from '../middlewares/uploadMiddleware.js';

const router = Router();

// POST /api/uploads/images?folder=restaurants - multipart/form-data, field name: "image"
// Response data: { url, publicId } (Cloudinary)
router.post('/images', protect, uploadImage, uploadController.uploadImage);

export default router;
