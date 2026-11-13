import Joi from 'joi';
import { cloudinaryImageUrl, objectId } from './commonValidation.js';

const orderItemOptionSchema = Joi.object({
  groupName: Joi.string().trim().min(1).max(100).required().messages({
    'string.base': 'Tên nhóm tùy chọn phải là chuỗi',
    'string.empty': 'Tên nhóm tùy chọn không được để trống',
    'any.required': 'Thiếu tên nhóm tùy chọn',
  }),
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.base': 'Tên tùy chọn phải là chuỗi',
    'string.empty': 'Tên tùy chọn không được để trống',
    'any.required': 'Thiếu tên tùy chọn',
  }),
  quantity: Joi.number().integer().min(1).max(99).default(1).messages({
    'number.base': 'Số lượng tùy chọn phải là số',
    'number.integer': 'Số lượng tùy chọn phải là số nguyên',
    'number.min': 'Số lượng tùy chọn tối thiểu là 1',
    'number.max': 'Số lượng tùy chọn tối đa là 99',
  }),
});

const orderItemSchema = Joi.object({
  menuItemId: objectId,
  foodId: objectId,
  name: Joi.string().trim().max(150).allow('', null),
  price: Joi.number().min(0),
  image: Joi.string().trim().max(500).allow('', null),
  quantity: Joi.number().integer().min(1).max(99).required().messages({
    'number.base': 'Số lượng món phải là số',
    'number.integer': 'Số lượng món phải là số nguyên',
    'number.min': 'Số lượng mỗi món tối thiểu là 1',
    'number.max': 'Số lượng mỗi món tối đa là 99',
    'any.required': 'Vui lòng cung cấp số lượng món',
  }),
  note: Joi.string().trim().max(200).allow('', null).default(''),
  options: Joi.array().items(orderItemOptionSchema).max(30).default([]),
})
  .or('menuItemId', 'foodId')
  .messages({
    'object.missing': 'Mỗi món ăn phải có menuItemId hoặc foodId hợp lệ',
  });

const deliveryAddressSchema = Joi.object({
  addressId: objectId.allow(null, '').optional(),
  recipientName: Joi.string().trim().min(1).max(100).required().messages({
    'string.base': 'Tên người nhận phải là chuỗi',
    'string.empty': 'Vui lòng nhập tên người nhận',
    'any.required': 'Vui lòng nhập tên người nhận',
  }),
  phone: Joi.string().trim().min(8).max(20).required().messages({
    'string.base': 'Số điện thoại phải là chuỗi',
    'string.empty': 'Vui lòng nhập số điện thoại giao hàng',
    'string.min': 'Số điện thoại không hợp lệ',
    'any.required': 'Vui lòng nhập số điện thoại giao hàng',
  }),
  addressLine: Joi.string().trim().min(1).max(300).required().messages({
    'string.base': 'Địa chỉ giao hàng phải là chuỗi',
    'string.empty': 'Vui lòng nhập địa chỉ giao hàng',
    'any.required': 'Vui lòng nhập địa chỉ giao hàng',
  }),
  note: Joi.string().trim().max(300).allow('', null).default(''),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).allow(null),
    lng: Joi.number().min(-180).max(180).allow(null),
  })
    .allow(null)
    .optional(),
})
  .required()
  .messages({
    'object.base': 'Thông tin địa chỉ giao hàng không hợp lệ',
    'any.required': 'Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng',
  });

export const createOrderSchema = Joi.object({
  restaurantId: objectId.required().messages({
    'any.required': 'Vui lòng chọn nhà hàng',
    'string.base': 'ID nhà hàng không hợp lệ',
  }),
  items: Joi.array().items(orderItemSchema).min(1).max(50).required().messages({
    'array.base': 'Danh sách món ăn phải là một mảng',
    'array.min': 'Đơn hàng phải có ít nhất 1 món ăn',
    'array.max': 'Đơn hàng tối đa 50 dòng món ăn',
    'any.required': 'Đơn hàng phải có ít nhất 1 món ăn',
  }),
  deliveryAddress: deliveryAddressSchema,
  paymentMethod: Joi.string().valid('banking', 'wallet').default('banking').messages({
    'any.only': 'Hệ thống hiện tại chỉ chấp nhận thanh toán bằng chuyển khoản ngân hàng hoặc ví ảo',
    'string.base': 'Phương thức thanh toán không hợp lệ',
  }),
  promotionCode: Joi.string().trim().max(50).allow('', null).default(null),
  restaurantVoucherCode: Joi.string().trim().max(50).allow('', null).default(null),
});

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

export const confirmDeliverySchema = Joi.object({
  deliveryProofUrl: cloudinaryImageUrl('Ảnh chứng minh giao hàng').required(),
});
