import Joi from 'joi';
import { getPublicIdFromUrl } from '../utils/cloudinaryUrl.js';

// MongoDB ObjectId as a 24-character hex string
export const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'ID không hợp lệ',
  'string.length': 'ID không hợp lệ',
});

// Route params like /:id
export const idParamSchema = Joi.object({
  id: objectId.required(),
});

/**
 * Image URL that must come from POST /api/uploads/images (our Cloudinary account).
 * Rejects any other host so callers cannot inject tracking / external images.
 */
export const cloudinaryImageUrl = (fieldLabel) =>
  Joi.string()
    .trim()
    .max(500)
    .custom((value, helpers) => (getPublicIdFromUrl(value) ? value : helpers.error('any.invalid')))
    .messages({
      'any.invalid': `${fieldLabel} phải là ảnh được tải lên qua hệ thống`,
      'string.empty': `Vui lòng tải ${fieldLabel.toLowerCase()}`,
      'any.required': `Vui lòng tải ${fieldLabel.toLowerCase()}`,
    });
