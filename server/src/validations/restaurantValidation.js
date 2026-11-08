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
  // updatedAt of the profile the form was loaded with (omitted when creating the profile)
  expectedUpdatedAt: Joi.date().iso(),
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
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }).optional(),
  categories: Joi.array().items(Joi.string().trim().max(30)).max(5).unique().default([]).messages({
    'array.max': 'Chọn tối đa 5 phân loại',
  }),
  // Image URLs returned by POST /api/uploads/images (our Cloudinary account only)
  logo: cloudinaryImageUrl('Logo').allow('').default(''),
  coverImage: cloudinaryImageUrl('Ảnh bìa').allow('').default(''),
  // TO-04: average minutes the kitchen needs; optional so an older client never resets it
  prepTime: Joi.number().integer().min(5).max(120).messages({
    'number.base': 'Thời gian chuẩn bị phải là số phút',
    'number.integer': 'Thời gian chuẩn bị phải là số phút',
    'number.min': 'Thời gian chuẩn bị tối thiểu 5 phút',
    'number.max': 'Thời gian chuẩn bị tối đa 120 phút',
  }),
  openingHours: Joi.array().items(openingHourSchema).length(7).unique('dayOfWeek').required().messages({
    'array.length': 'Giờ mở cửa phải đủ 7 ngày trong tuần',
    'array.unique': 'Mỗi ngày chỉ được khai báo một lần',
  }),
  // The payout bank account is set in the wallet (PUT /api/restaurants/me/wallet/payout-account), not here:
  // a payoutAccount sent with the profile is stripped by the validation
});

// PATCH /api/restaurants/me/accepting-orders - pause / resume new orders
export const acceptingOrdersSchema = Joi.object({
  isAcceptingOrders: Joi.boolean().required().messages({
    'boolean.base': 'Trạng thái nhận đơn không hợp lệ',
    'any.required': 'Thiếu trạng thái nhận đơn',
  }),
});
