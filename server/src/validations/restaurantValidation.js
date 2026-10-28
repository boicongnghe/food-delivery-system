import Joi from 'joi';
import { cloudinaryImageUrl } from './commonValidation.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_PATTERN = /^(0|\+84)\d{9,10}$/;

const timeField = Joi.string().pattern(TIME_PATTERN).required().messages({
  'string.pattern.base': 'Giờ phải có định dạng HH:mm',
  'string.empty': 'Giờ không được để trống',
});

const shiftSchema = Joi.object({
  open: timeField,
  close: timeField,
}).custom((shift, helpers) => {
  if (shift.open >= shift.close) {
    return helpers.message('Giờ đóng cửa phải sau giờ mở cửa');
  }
  return shift;
});

const openingHourSchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  isOpen: Joi.boolean().required(),
  shifts: Joi.array()
    .items(shiftSchema)
    .max(2)
    .when('isOpen', { is: true, then: Joi.array().min(1) })
    .custom((shifts, helpers) => {
      // The second shift must start after the first one ends
      if (shifts.length === 2 && shifts[1].open < shifts[0].close) {
        return helpers.message('Ca thứ hai phải bắt đầu sau khi ca thứ nhất kết thúc');
      }
      return shifts;
    })
    .messages({
      'array.min': 'Ngày mở cửa phải có ít nhất 1 ca',
      'array.max': 'Mỗi ngày tối đa 2 ca',
    }),
});

export const updateRestaurantProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required().messages({
    'string.empty': 'Tên quán không được để trống',
    'string.min': 'Tên quán phải có ít nhất 2 ký tự',
    'string.max': 'Tên quán tối đa 60 ký tự',
    'any.required': 'Tên quán là bắt buộc',
  }),
  description: Joi.string().trim().max(150).allow('').default('').messages({
    'string.max': 'Mô tả tối đa 150 ký tự',
  }),
  address: Joi.string().trim().min(5).max(200).required().messages({
    'string.empty': 'Địa chỉ không được để trống',
    'string.min': 'Địa chỉ quá ngắn',
    'any.required': 'Địa chỉ là bắt buộc',
  }),
  phone: Joi.string().trim().pattern(PHONE_PATTERN).required().messages({
    'string.empty': 'Số điện thoại không được để trống',
    'string.pattern.base': 'Số điện thoại không hợp lệ',
    'any.required': 'Số điện thoại là bắt buộc',
  }),
  categories: Joi.array().items(Joi.string().trim().max(30)).max(5).unique().default([]).messages({
    'array.max': 'Chọn tối đa 5 phân loại',
  }),
  // Image URLs returned by POST /api/uploads/images (our Cloudinary account only)
  logo: cloudinaryImageUrl('Logo').allow('').default(''),
  coverImage: cloudinaryImageUrl('Ảnh bìa').allow('').default(''),
  openingHours: Joi.array().items(openingHourSchema).length(7).unique('dayOfWeek').required().messages({
    'array.length': 'Giờ mở cửa phải đủ 7 ngày trong tuần',
    'array.unique': 'Mỗi ngày chỉ được khai báo một lần',
  }),
  // Optional and without default: an old client that does not send it never wipes the saved account
  payoutAccount: Joi.object({
    bankName: Joi.string().trim().max(60).allow('').default(''),
    accountNumber: Joi.string().trim().pattern(/^\d{6,20}$/).allow('').default('').messages({
      'string.pattern.base': 'Số tài khoản gồm 6–20 chữ số',
    }),
    accountHolder: Joi.string().trim().uppercase().max(100).allow('').default(''),
  })
    .custom((account, helpers) => {
      const filled = [account.bankName, account.accountNumber, account.accountHolder].filter(Boolean).length;
      // All three or none: a half-filled account cannot receive money
      return filled === 0 || filled === 3
        ? account
        : helpers.message('Nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản (hoặc để trống cả ba)');
    }),
});
