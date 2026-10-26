import Joi from 'joi';
import { REVIEW_HIDE_REASONS } from '../models/Review.js';
import { keywordQuery, pageQueryKeys } from './commonValidation.js';

const rating = Joi.number().integer().min(1).max(5).messages({
  'number.base': 'Số sao phải từ 1 đến 5',
  'number.min': 'Số sao phải từ 1 đến 5',
  'number.max': 'Số sao phải từ 1 đến 5',
});

// POST /api/orders/:id/reviews - shipperRating is required by the service when the order had a shipper
export const createReviewSchema = Joi.object({
  restaurantRating: rating.required().messages({ 'any.required': 'Vui lòng chấm sao cho nhà hàng' }),
  comment: Joi.string().trim().max(500).allow('').default('').messages({
    'string.max': 'Nhận xét tối đa 500 ký tự',
  }),
  shipperRating: rating.allow(null).default(null),
  shipperComment: Joi.string().trim().max(300).allow('').default('').messages({
    'string.max': 'Nhận xét về shipper tối đa 300 ký tự',
  }),
});

export const myListQuerySchema = Joi.object(pageQueryKeys);

export const adminReviewQuerySchema = Joi.object({
  ...pageQueryKeys,
  keyword: keywordQuery,
  visibility: Joi.string().valid('all', 'visible', 'hidden').default('all'),
  rating: Joi.number().integer().min(1).max(5).allow('').default(''),
});

// PATCH /api/admin/reviews/:id/visibility - hide a violating review (or restore it)
export const reviewVisibilitySchema = Joi.object({
  isHidden: Joi.boolean().required(),
  reason: Joi.when('isHidden', {
    is: true,
    then: Joi.string()
      .valid(...REVIEW_HIDE_REASONS)
      .required(),
    otherwise: Joi.any().strip(),
  }).messages({ 'any.only': 'Lý do ẩn không hợp lệ', 'any.required': 'Vui lòng chọn lý do ẩn đánh giá' }),
  note: Joi.when('isHidden', {
    is: true,
    then: Joi.when('reason', {
      is: 'other',
      then: Joi.string().trim().min(3).max(300).required(),
      otherwise: Joi.string().trim().max(300).allow('').default(''),
    }),
    otherwise: Joi.any().strip(),
  }).messages({
    'string.min': 'Vui lòng ghi rõ lý do (ít nhất 3 ký tự)',
    'string.empty': 'Vui lòng ghi rõ lý do',
    'any.required': 'Vui lòng ghi rõ lý do',
    'string.max': 'Ghi chú tối đa 300 ký tự',
  }),
});
