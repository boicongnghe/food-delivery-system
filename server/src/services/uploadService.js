import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import Complaint from '../models/Complaint.js';
import DeliveryIssue from '../models/DeliveryIssue.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { ROOT_FOLDER, getPublicIdFromUrl } from '../utils/cloudinaryUrl.js';

// Check real file content (magic bytes) instead of trusting the client mimetype
const isRealImage = (buffer) => {
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return isJpeg || isPng || isWebp;
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Delete without failing the main request (e.g. cleaning an old image after an update)
export const deleteImageQuietly = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true }); // also purge the CDN cache
  } catch (error) {
    console.error(`[Cloudinary] Could not delete ${publicId}: ${error.message}`);
  }
};

/**
 * Upload an in-memory image (from multer) to Cloudinary.
 * Files are stored per user: food-delivery/<folder>/<userId>/<random id>
 */
export const uploadImage = async (buffer, folder, userId) => {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(500, 'Cloudinary chưa được cấu hình. Kiểm tra biến CLOUDINARY_URL trong server/.env');
  }
  if (!isRealImage(buffer)) {
    throw new ApiError(400, 'File không phải ảnh JPG, PNG hoặc WEBP hợp lệ');
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${ROOT_FOLDER}/${folder}/${userId}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        // Resize large photos on upload to save storage and bandwidth
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
      },
      (error, uploadResult) => {
        if (error) {
          // 401/403 = wrong key or key without upload permission (config problem, not user input)
          const hint =
            error.http_code === 403
              ? 'API key không có quyền upload. Kiểm tra quyền của key trong Cloudinary > Settings > API Keys'
              : error.message;
          return reject(new ApiError(502, `Tải ảnh lên Cloudinary thất bại: ${hint}`));
        }
        resolve(uploadResult);
      },
    );

    stream.end(buffer);
  });

  // Pixel bombs: this server never decodes images; Cloudinary enforces its own megapixel limit
  return { url: result.secure_url, publicId: result.public_id };
};

/**
 * R09 - an image can only be attached by the user who uploaded it, from a folder allowed for that use.
 * Uploads live in food-delivery/<folder>/<userId>/..., so another user's avatar or dish photo is refused.
 */
export const assertOwnUpload = (url, userId, folders, field) => {
  const [root, folder, owner] = getPublicIdFromUrl(url)?.split('/') || [];
  if (root !== ROOT_FOLDER || !folders.includes(folder) || owner !== String(userId)) {
    throw new ApiError(400, 'Dữ liệu không hợp lệ', [{ field, message: 'Ảnh phải do chính bạn tải lên' }]);
  }
};

// Every place that can still show an image: menus, restaurant profiles, avatars, feedback evidence,
// delivery proofs and item snapshots of orders (old orders must keep their photos)
const isImageInUse = async (url, publicId) => {
  const urlRegex = new RegExp(escapeRegex(publicId));
  const usages = await Promise.all([
    MenuItem.exists({ $or: [{ imagePublicId: publicId }, { image: url }] }),
    Restaurant.exists({ $or: [{ logo: urlRegex }, { coverImage: urlRegex }] }),
    User.exists({ avatar: url }),
    Complaint.exists({ images: url }),
    DeliveryIssue.exists({ images: url }),
    Order.exists({ 'items.image': url }),
    Order.exists({ 'deliveryProof.imageUrl': url }),
  ]);
  return usages.some(Boolean);
};

/**
 * Remove a replaced image from Cloudinary unless something still shows it. Call after the new value is saved.
 * A save racing with this check can still reference the image a moment later; acceptable for replaced images.
 */
export const deleteImageIfUnused = async (url) => {
  const publicId = getPublicIdFromUrl(url);
  if (!publicId || (await isImageInUse(url, publicId))) return;
  await deleteImageQuietly(publicId);
};

/**
 * Discard an image the user uploaded but never saved (e.g. closed the form).
 * Only the uploader can delete it, and only while nothing references it.
 */
export const deleteUnusedImage = async (url, userId) => {
  const publicId = getPublicIdFromUrl(url);
  // Uploads live in food-delivery/<folder>/<userId>/...
  if (!publicId || publicId.split('/')[2] !== String(userId)) {
    throw new ApiError(403, 'Bạn không có quyền xóa ảnh này');
  }
  if (await isImageInUse(url, publicId)) {
    throw new ApiError(409, 'Ảnh đang được sử dụng, không thể xóa');
  }

  await cloudinary.uploader.destroy(publicId, { invalidate: true }); // also purge the CDN cache
};
