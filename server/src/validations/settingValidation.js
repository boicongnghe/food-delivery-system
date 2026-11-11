import Joi from 'joi';

const minutes = (label, min, max) =>
  Joi.number()
    .integer()
    .min(min)
    .max(max)
    .required()
    .messages({
      'number.base': `${label} phải là số`,
      'number.integer': `${label} phải là số nguyên`,
      'number.min': `${label} tối thiểu ${min}`,
      'number.max': `${label} tối đa ${max}`,
      'any.required': `${label} là bắt buộc`,
    });

// A reminder must come before the automatic action it warns about
const after = (field, label) =>
  Joi.number().greater(Joi.ref(field)).messages({ 'number.greater': `${label} phải lớn hơn thời gian nhắc` });

// PUT /api/admin/settings/order-timeouts - the whole form is sent, in minutes
export const orderTimeoutSettingsSchema = Joi.object({
  payTimeout: minutes('Thời hạn thanh toán', 5, 120),
  acceptRemind: minutes('Thời gian nhắc quán nhận đơn', 1, 30),
  acceptTimeout: minutes('Thời gian tự hủy khi quán không nhận', 2, 60).concat(after('acceptRemind', 'Thời gian tự hủy')),
  defaultPrepTime: minutes('Thời gian chuẩn bị mặc định', 5, 120),
  prepGrace: minutes('Thời gian ân hạn chuẩn bị', 5, 120),
  shipperRemind: minutes('Thời gian báo admin khi chưa có shipper', 1, 60),
  shipperTimeout: minutes('Thời gian tự hủy khi chưa có shipper', 5, 120).concat(
    after('shipperRemind', 'Thời gian tự hủy'),
  ),
  pickupWait: minutes('Thời gian shipper chờ ở quán', 5, 120),
  closingCutoff: minutes('Thời gian ngừng nhận đơn trước giờ đóng', 0, 180),
});

// PUT /api/admin/settings/violations - 0 turns the automatic suspension off
export const violationPolicySchema = Joi.object({
  autoSuspendThreshold: Joi.number().integer().min(0).max(20).required().messages({
    'number.base': 'Số lần vi phạm phải là số',
    'number.integer': 'Số lần vi phạm phải là số nguyên',
    'number.min': 'Số lần vi phạm tối thiểu 0 (tắt tự động đình chỉ)',
    'number.max': 'Số lần vi phạm tối đa 20',
    'any.required': 'Số lần vi phạm là bắt buộc',
  }),
});

export const shippingFeeSettingSchema = Joi.object({
  baseDistanceKm: Joi.number().min(0).max(50).required().messages({
    'number.base': 'Khoảng cách cơ bản phải là số',
    'number.min': 'Khoảng cách cơ bản tối thiểu 0 km',
    'number.max': 'Khoảng cách cơ bản tối đa 50 km',
    'any.required': 'Khoảng cách cơ bản là bắt buộc',
  }),
  baseFee: Joi.number().integer().min(0).max(1000000).required().messages({
    'number.base': 'Cước phí cơ bản phải là số',
    'number.min': 'Cước phí cơ bản tối thiểu 0đ',
    'any.required': 'Cước phí cơ bản là bắt buộc',
  }),
  perKmFee: Joi.number().integer().min(0).max(500000).required().messages({
    'number.base': 'Cước phí mỗi km phải là số',
    'number.min': 'Cước phí mỗi km tối thiểu 0đ',
    'any.required': 'Cước phí mỗi km là bắt buộc',
  }),
  maxDistanceKm: Joi.number().min(1).max(100).greater(Joi.ref('baseDistanceKm')).required().messages({
    'number.base': 'Bán kính giao hàng tối đa phải là số',
    'number.min': 'Bán kính giao hàng tối đa tối thiểu 1 km',
    'number.greater': 'Bán kính tối đa phải lớn hơn khoảng cách cơ bản',
    'any.required': 'Bán kính giao hàng tối đa là bắt buộc',
  }),
});
