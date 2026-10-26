import Joi from 'joi';
import { keywordQuery, pageQueryKeys } from './commonValidation.js';

export const PROMOTION_STATUSES = ['active', 'scheduled', 'expired', 'disabled', 'exhausted'];

// Field names follow the PromotionRule model used by checkout (validateAndApplyPromotion)
export const promotionRuleSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9_-]{3,20}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mã chỉ gồm chữ không dấu, số, "-" hoặc "_" (3-20 ký tự)',
      'string.empty': 'Mã khuyến mãi không được để trống',
      'any.required': 'Mã khuyến mãi là bắt buộc',
    }),
  title: Joi.string().trim().min(3).max(80).required().messages({
    'string.empty': 'Tên chương trình không được để trống',
    'string.min': 'Tên chương trình ít nhất 3 ký tự',
    'string.max': 'Tên chương trình tối đa 80 ký tự',
    'any.required': 'Tên chương trình là bắt buộc',
  }),
  description: Joi.string().trim().max(300).allow('').default('').messages({
    'string.max': 'Mô tả tối đa 300 ký tự',
  }),
  discountType: Joi.string()
    .valid('percentage', 'fixed')
    .required()
    .messages({ 'any.only': 'Loại giảm giá không hợp lệ', 'any.required': 'Vui lòng chọn loại giảm giá' }),
  discountValue: Joi.when('discountType', {
    is: 'percentage',
    then: Joi.number().integer().min(1).max(100).required().messages({
      'number.min': 'Phần trăm giảm từ 1 đến 100',
      'number.max': 'Phần trăm giảm từ 1 đến 100',
    }),
    otherwise: Joi.number().integer().min(1000).max(10000000).required().messages({
      'number.min': 'Số tiền giảm tối thiểu 1.000đ',
      'number.max': 'Số tiền giảm tối đa 10.000.000đ',
    }),
  }).messages({ 'number.base': 'Mức giảm phải là số', 'any.required': 'Mức giảm là bắt buộc' }),
  minOrderValue: Joi.number().integer().min(0).max(100000000).default(0).messages({
    'number.base': 'Giá trị đơn tối thiểu phải là số',
    'number.min': 'Giá trị đơn tối thiểu không được âm',
  }),
  // Only a percentage discount needs a cap
  maxDiscount: Joi.when('discountType', {
    is: 'percentage',
    then: Joi.number().integer().min(1000).max(10000000).allow(null).default(null),
    otherwise: Joi.any().strip(),
  }).messages({ 'number.base': 'Mức giảm tối đa phải là số', 'number.min': 'Mức giảm tối đa ít nhất 1.000đ' }),
  startDate: Joi.date().iso().required().messages({
    'date.base': 'Thời gian bắt đầu không hợp lệ',
    'date.format': 'Thời gian bắt đầu không hợp lệ',
    'any.required': 'Vui lòng chọn thời gian bắt đầu',
  }),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
    'date.base': 'Thời gian kết thúc không hợp lệ',
    'date.format': 'Thời gian kết thúc không hợp lệ',
    'date.greater': 'Thời gian kết thúc phải sau thời gian bắt đầu',
    'any.required': 'Vui lòng chọn thời gian kết thúc',
  }),
  // null = unlimited (checkout skips the limit when usageLimit is empty)
  usageLimit: Joi.number().integer().min(1).max(1000000).allow(null).default(null).messages({
    'number.base': 'Số lượt sử dụng phải là số',
    'number.min': 'Số lượt sử dụng ít nhất là 1',
  }),
  isActive: Joi.boolean().default(true),
});

export const promotionRuleQuerySchema = Joi.object({
  ...pageQueryKeys,
  keyword: keywordQuery,
  status: Joi.string()
    .valid('all', ...PROMOTION_STATUSES)
    .default('all'),
});
