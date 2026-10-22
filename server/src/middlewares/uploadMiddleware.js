import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP'));
  }
  cb(null, true);
};

// Keep the file in memory (req.file.buffer); the service streams it to Cloudinary
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('image');
