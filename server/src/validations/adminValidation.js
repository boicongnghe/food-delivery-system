import Joi from 'joi';
import { PARTNER_STATUSES } from '../models/Restaurant.js';
import { keywordQuery, pageQueryKeys } from './commonValidation.js';

// Restaurant / shipper lists: one tab per approval status
export const partnerQuerySchema = Joi.object({
  ...pageQueryKeys,
  keyword: keywordQuery,
  status: Joi.string()
    .valid('all', ...PARTNER_STATUSES)
    .default('all'),
});

// approved = approve / reopen, rejected = reject a pending profile, suspended = suspend an active partner
export const partnerStatusSchema = Joi.object({
  status: Joi.string()
    .valid('approved', 'rejected', 'suspended')
    .required()
    .messages({ 'any.only': 'Trạng thái không hợp lệ', 'any.required': 'Vui lòng chọn trạng thái' }),
  note: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .default('')
    .when('status', {
      is: Joi.valid('rejected', 'suspended'),
      then: Joi.string().trim().min(5).required(),
    })
    .messages({
      'string.empty': 'Vui lòng nhập lý do',
      'string.min': 'Lý do cần ít nhất 5 ký tự',
      'string.max': 'Lý do tối đa 500 ký tự',
      'any.required': 'Vui lòng nhập lý do',
    }),
});
