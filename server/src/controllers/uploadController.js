import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import * as uploadService from '../services/uploadService.js';

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Vui lòng chọn một ảnh để tải lên');
  }

  const image = await uploadService.uploadImage(req.file.buffer, req.query.folder, req.user._id);

  res.status(201).json({
    success: true,
    data: image,
    message: 'Tải ảnh lên thành công',
  });
});

export const deleteUnusedImage = asyncHandler(async (req, res) => {
  await uploadService.deleteUnusedImage(req.body.url, req.user._id);

  res.status(200).json({
    success: true,
    data: null,
    message: 'Đã xóa ảnh chưa sử dụng',
  });
});
