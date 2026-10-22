import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import * as uploadService from '../services/uploadService.js';

const ALLOWED_FOLDERS = ['common', 'restaurants', 'menu-items', 'avatars'];

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Vui lòng chọn một ảnh để tải lên');
  }

  const folder = ALLOWED_FOLDERS.includes(req.query.folder) ? req.query.folder : 'common';
  const image = await uploadService.uploadImage(req.file.buffer, folder);

  res.status(201).json({
    success: true,
    data: image,
    message: 'Tải ảnh lên thành công',
  });
});
