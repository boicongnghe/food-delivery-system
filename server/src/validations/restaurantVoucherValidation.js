import Joi from 'joi';
import { VOUCHER_DISCOUNT_TYPES } from '../models/RestaurantVoucher.js';

const money = (label, min, max) =>
  Joi.number()
    .integer()
    .min(min)
    .max(max)
    .messages({
      'number.base': `${label} phải là số`,
      'number.integer': `${label} phải là số nguyên`,
      'number.min': `${label} tối thiểu ${min.toLocaleString('vi-VN')}`,
      'number.max': `${label} tối đa ${max.toLocaleString('vi-VN')}`,
      'any.required': `${label} là bắt buộc`,
    });

// POST / PUT /api/restaurants/me/vouchers
export const voucherSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9]{4,20}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mã gồm 4–20 chữ cái hoặc chữ số, không dấu, không khoảng trắng',
      'string.empty': 'Vui lòng nhập mã giảm giá',
      'any.required': 'Vui lòng nhập mã giảm giá',
    }),
  title: Joi.string().trim().min(3).max(60).required().messages({
    'string.empty': 'Vui lòng nhập tên chương trình',
    'string.min': 'Tên chương trình tối thiểu 3 ký tự',
    'string.max': 'Tên chương trình tối đa 60 ký tự',
    'any.required': 'Vui lòng nhập tên chương trình',
  }),
  discountType: Joi.string()
    .valid(...VOUCHER_DISCOUNT_TYPES)
    .required()
    .messages({ 'any.only': 'Loại giảm giá không hợp lệ', 'any.required': 'Vui lòng chọn loại giảm giá' }),
  discountValue: Joi.when('discountType', {
    is: 'percentage',
    then: money('Phần trăm giảm', 1, 100).required(),
    otherwise: money('Số tiền giảm', 1000, 1000000).required(),
  }),
  // A percentage voucher must have a cap: without it one big order could cost the restaurant a fortune
  maxDiscount: Joi.when('discountType', {
    is: 'percentage',
    then: money('Giảm tối đa', 1000, 1000000).required(),
    otherwise: Joi.any().strip(),
  }),
  minOrderValue: money('Đơn tối thiểu', 0, 10000000).default(0),
  startAt: Joi.date().iso().required().messages({ 'date.base': 'Thời gian bắt đầu không hợp lệ', 'any.required': 'Vui lòng chọn thời gian bắt đầu' }),
  endAt: Joi.date()
    .iso()
    .greater(Joi.ref('startAt'))
    .greater('now')
    .required()
    .messages({
      'date.base': 'Thời gian kết thúc không hợp lệ',
      'date.greater': 'Thời gian kết thúc phải sau thời gian bắt đầu và sau hiện tại',
      'any.required': 'Vui lòng chọn thời gian kết thúc',
    }),
  usageLimit: money('Tổng lượt dùng', 1, 100000).allow(null).default(null),
  perCustomerLimit: money('Lượt dùng mỗi khách', 1, 10).default(1),
  isActive: Joi.boolean().default(true),
})
  .custom((voucher, helpers) =>
    // A fixed amount larger than the order would give food away for free
    voucher.discountType === 'fixed' && voucher.minOrderValue < voucher.discountValue
      ? helpers.message('Đơn tối thiểu phải lớn hơn hoặc bằng số tiền giảm')
      : voucher,
  )
  .messages({ 'any.custom': '{#message}' });

// PATCH /api/restaurants/me/vouchers/:id/active
export const voucherActiveSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

// GET /api/restaurant-vouchers?restaurantId=
export const runningVouchersQuerySchema = Joi.object({
  restaurantId: Joi.string().trim().max(200).required(),
});

// POST /api/restaurant-vouchers/apply - checkout preview, checked again when the order is created
export const applyVoucherSchema = Joi.object({
  restaurantId: Joi.string().trim().max(200).required(),
  code: Joi.string().trim().uppercase().max(20).required().messages({ 'string.empty': 'Vui lòng chọn mã giảm giá' }),
  subtotal: Joi.number().integer().min(0).required(),
});
