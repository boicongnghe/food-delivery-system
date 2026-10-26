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

// ?page=1&limit=10 (spread into a query schema)
export const pageQueryKeys = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
};

export const keywordQuery = Joi.string().trim().max(100).allow('').default('');

// Calendar day "YYYY-MM-DD"; impossible dates such as 2026-02-30 are rejected
export const dateString = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : helpers.error('any.invalid');
  })
  .messages({ 'string.pattern.base': 'Ngày phải có dạng YYYY-MM-DD', 'any.invalid': 'Ngày không hợp lệ' });

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
