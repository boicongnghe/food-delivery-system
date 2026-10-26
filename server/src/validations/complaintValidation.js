import Joi from 'joi';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from '../models/Complaint.js';
import { cloudinaryImageUrl, keywordQuery, pageQueryKeys } from './commonValidation.js';

export const MAX_EVIDENCE_IMAGES = 3;

// Evidence photos uploaded through POST /api/uploads/images
export const evidenceImages = Joi.array()
  .items(cloudinaryImageUrl('Ảnh minh chứng'))
  .max(MAX_EVIDENCE_IMAGES)
  .unique()
  .default([])
  .messages({ 'array.max': `Tối đa ${MAX_EVIDENCE_IMAGES} ảnh minh chứng`, 'array.unique': 'Ảnh bị trùng' });

export const issueDescription = Joi.string().trim().min(10).max(1000).required().messages({
  'string.empty': 'Vui lòng mô tả vấn đề',
  'string.min': 'Mô tả ít nhất 10 ký tự',
  'string.max': 'Mô tả tối đa 1000 ký tự',
  'any.required': 'Vui lòng mô tả vấn đề',
});

// POST /api/orders/:id/complaints
export const createComplaintSchema = Joi.object({
  category: Joi.string()
    .valid(...COMPLAINT_CATEGORIES)
    .required()
    .messages({ 'any.only': 'Loại khiếu nại không hợp lệ', 'any.required': 'Vui lòng chọn loại khiếu nại' }),
  description: issueDescription,
  images: evidenceImages,
});

export const adminComplaintQuerySchema = Joi.object({
  ...pageQueryKeys,
  keyword: keywordQuery,
  status: Joi.string()
    .valid('all', ...COMPLAINT_STATUSES)
    .default('open'),
  category: Joi.string()
    .valid('all', ...COMPLAINT_CATEGORIES)
    .default('all'),
});

export const resolutionNote = Joi.string().trim().min(5).max(500).required().messages({
  'string.empty': 'Vui lòng nhập nội dung phản hồi',
  'string.min': 'Nội dung phản hồi ít nhất 5 ký tự',
  'string.max': 'Nội dung phản hồi tối đa 500 ký tự',
  'any.required': 'Vui lòng nhập nội dung phản hồi',
});

// PATCH /api/admin/complaints/:id/resolution - the refund limit is checked against the order in the service
export const resolveComplaintSchema = Joi.object({
  decision: Joi.string()
    .valid('resolved', 'rejected')
    .required()
    .messages({ 'any.only': 'Quyết định không hợp lệ', 'any.required': 'Vui lòng chọn cách xử lý' }),
  note: resolutionNote,
  refundAmount: Joi.when('decision', {
    is: 'resolved',
    then: Joi.number().integer().min(0).default(0),
    otherwise: Joi.any().strip(),
  }).messages({
    'number.base': 'Số tiền hoàn phải là số',
    'number.min': 'Số tiền hoàn không được âm',
    'number.integer': 'Số tiền hoàn phải là số nguyên (VND)',
  }),
});
