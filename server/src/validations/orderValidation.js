import Joi from 'joi';

export const REJECT_REASONS = ['out_of_stock', 'too_busy', 'closing_soon', 'other'];

export const rejectOrderSchema = Joi.object({
  reason: Joi.string()
    .valid(...REJECT_REASONS)
    .required()
    .messages({ 'any.only': 'Lý do từ chối không hợp lệ', 'any.required': 'Vui lòng chọn lý do từ chối' }),
  // "other" needs a written reason; separate branches because allow('') would leak into the required branch
  note: Joi.when('reason', {
    is: 'other',
    then: Joi.string().trim().min(3).max(200).required(),
    otherwise: Joi.string().trim().max(200).allow('').default(''),
  }).messages({
    'string.min': 'Vui lòng ghi rõ lý do (ít nhất 3 ký tự)',
    'string.empty': 'Vui lòng ghi rõ lý do',
    'any.required': 'Vui lòng ghi rõ lý do',
    'string.max': 'Lý do tối đa 200 ký tự',
  }),
});

// GET /lookup?code=gn-0042 -> "GN-0042"
export const orderLookupQuerySchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^GN-\d{4,}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mã đơn có dạng GN-0042',
      'string.empty': 'Vui lòng nhập mã đơn',
      'any.required': 'Vui lòng nhập mã đơn',
    }),
});

export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});
