import Joi from 'joi';
import { dateString } from './commonValidation.js';

export const MAX_REPORT_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/admin/analytics?from=2026-10-01&to=2026-10-31 (Vietnam calendar days, both inclusive)
export const analyticsQuerySchema = Joi.object({
  from: dateString.required().messages({ 'any.required': 'Vui lòng chọn ngày bắt đầu' }),
  to: dateString
    .required()
    .custom((value, helpers) => {
      const { from } = helpers.state.ancestors[0];
      if (value < from) return helpers.error('date.order');
      if ((Date.parse(value) - Date.parse(from)) / DAY_MS + 1 > MAX_REPORT_DAYS) return helpers.error('date.range');
      return value;
    })
    .messages({
      'any.required': 'Vui lòng chọn ngày kết thúc',
      'date.order': 'Ngày kết thúc phải từ ngày bắt đầu trở đi',
      'date.range': `Khoảng thời gian tối đa ${MAX_REPORT_DAYS} ngày`,
    }),
});
