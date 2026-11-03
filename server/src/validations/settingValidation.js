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

// PUT /api/admin/settings/order-timeouts - the whole form is sent (minutes unless noted)
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
  reconInterval: minutes('Chu kỳ đối soát', 5, 60),
  refundSlaHours: minutes('Hạn hoàn tiền (giờ)', 1, 168),
});
