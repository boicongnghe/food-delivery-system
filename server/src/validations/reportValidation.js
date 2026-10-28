import Joi from 'joi';
import { vietnamDateString } from '../utils/date.js';
import { dateString, keywordQuery, pageQueryKeys } from './commonValidation.js';
import { MAX_REPORT_DAYS } from './analyticsValidation.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const REPORT_ORDER_TABS = ['all', 'delivered', 'in_progress', 'cancelled', 'rejected'];

// ?from=2026-10-01&to=2026-10-31 (Vietnam calendar days, both inclusive, never in the future)
const rangeKeys = {
  from: dateString.required().messages({ 'any.required': 'Vui lòng chọn ngày bắt đầu' }),
  to: dateString
    .required()
    .custom((value, helpers) => {
      const { from } = helpers.state.ancestors[0];
      if (value < from) return helpers.error('date.order');
      if (value > vietnamDateString()) return helpers.error('date.future');
      if ((Date.parse(value) - Date.parse(from)) / DAY_MS + 1 > MAX_REPORT_DAYS) return helpers.error('date.range');
      return value;
    })
    .messages({
      'any.required': 'Vui lòng chọn ngày kết thúc',
      'date.order': 'Ngày kết thúc phải từ ngày bắt đầu trở đi',
      'date.future': 'Ngày kết thúc không được sau hôm nay',
      'date.range': `Khoảng thời gian tối đa ${MAX_REPORT_DAYS} ngày`,
    }),
};

// GET /api/restaurants/me/reports/overview and /settlements
export const reportRangeQuerySchema = Joi.object(rangeKeys);

// GET /api/restaurants/me/reports/orders
export const reportOrdersQuerySchema = Joi.object({
  ...rangeKeys,
  ...pageQueryKeys,
  status: Joi.string()
    .valid(...REPORT_ORDER_TABS)
    .default('all'),
  keyword: keywordQuery,
});

// GET /api/restaurants/me/reports/orders/export - same filters, every row (no paging)
export const reportOrdersExportQuerySchema = Joi.object({
  ...rangeKeys,
  status: Joi.string()
    .valid(...REPORT_ORDER_TABS)
    .default('all'),
  keyword: keywordQuery,
});

// GET /api/restaurants/me/reports/reviews
export const reportReviewsQuerySchema = Joi.object({
  ...rangeKeys,
  ...pageQueryKeys,
  rating: Joi.number().integer().min(1).max(5).allow(null).default(null),
});
