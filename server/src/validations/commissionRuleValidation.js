import Joi from 'joi';
import { COMMISSION_TARGETS } from '../models/CommissionRule.js';
import { dateString, keywordQuery, objectId } from './commonValidation.js';

// GET /api/admin/restaurants - restaurant picker of the rule form
export const restaurantOptionsQuerySchema = Joi.object({
  keyword: keywordQuery,
  limit: Joi.number().integer().min(1).max(50).default(20),
});

// "Today or later" depends on whether the rule already started, so the service checks it
export const commissionRuleSchema = Joi.object({
  name: Joi.string().trim().min(3).max(80).required().messages({
    'string.empty': 'Tên quy tắc không được để trống',
    'string.min': 'Tên quy tắc ít nhất 3 ký tự',
    'string.max': 'Tên quy tắc tối đa 80 ký tự',
    'any.required': 'Tên quy tắc là bắt buộc',
  }),
  target: Joi.string()
    .valid(...COMMISSION_TARGETS)
    .required()
    .messages({ 'any.only': 'Đối tượng thu phí không hợp lệ', 'any.required': 'Vui lòng chọn đối tượng thu phí' }),
  // null / '' = every restaurant. Shippers always share one rate.
  restaurant: Joi.when('target', {
    is: 'restaurant',
    then: objectId.allow(null).empty('').default(null),
    otherwise: Joi.valid(null).empty('').default(null),
  }).messages({ 'any.only': 'Hoa hồng shipper áp dụng cho mọi shipper, không chọn nhà hàng' }),
  rate: Joi.number().min(0).max(100).precision(2).required().messages({
    'number.base': 'Tỷ lệ phải là số',
    'number.min': 'Tỷ lệ từ 0 đến 100%',
    'number.max': 'Tỷ lệ từ 0 đến 100%',
    'any.required': 'Tỷ lệ hoa hồng là bắt buộc',
  }),
  effectiveFrom: dateString.required().messages({ 'any.required': 'Vui lòng chọn ngày bắt đầu' }),
  effectiveTo: dateString
    .allow(null)
    .default(null)
    .custom((value, helpers) => {
      const { effectiveFrom } = helpers.state.ancestors[0];
      return value && effectiveFrom && value < effectiveFrom ? helpers.error('date.order') : value;
    })
    .messages({ 'date.order': 'Ngày kết thúc phải từ ngày bắt đầu trở đi' }),
  note: Joi.string().trim().max(200).allow('').default('').messages({ 'string.max': 'Ghi chú tối đa 200 ký tự' }),
});
