import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';

const ROOT_FOLDER = 'food-delivery';

// Upload an in-memory image (from multer) to Cloudinary
export const uploadImage = (buffer, folder = 'common') => {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(500, 'Cloudinary chưa được cấu hình. Kiểm tra biến CLOUDINARY_URL trong server/.env');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${ROOT_FOLDER}/${folder}`,
        resource_type: 'image',
        // Resize large photos on upload to save storage and bandwidth
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) {
          // 401/403 = wrong key or key without upload permission (config problem, not user input)
          const hint =
            error.http_code === 403
              ? 'API key không có quyền upload. Kiểm tra quyền của key trong Cloudinary > Settings > API Keys'
              : error.message;
          return reject(new ApiError(502, `Tải ảnh lên Cloudinary thất bại: ${hint}`));
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );

    stream.end(buffer);
  });
};
