import Joi from 'joi';
import { cloudinaryImageUrl } from './commonValidation.js';

export const UPLOAD_FOLDERS = ['restaurants', 'menu-items'];

export const uploadQuerySchema = Joi.object({
  folder: Joi.string()
    .valid(...UPLOAD_FOLDERS)
    .required()
    .messages({ 'any.only': 'Thư mục ảnh không hợp lệ', 'any.required': 'Thiếu thư mục ảnh' }),
});

// DELETE /api/uploads/images - discard an image that was uploaded but never saved
export const deleteUploadSchema = Joi.object({
  url: cloudinaryImageUrl('Ảnh').required(),
});
