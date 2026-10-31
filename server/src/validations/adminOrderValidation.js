import Joi from 'joi';
import { PAYMENT_METHODS } from '../models/Order.js';
import { dateString, keywordQuery, pageQueryKeys } from './commonValidation.js';

// Tabs of the platform order list; "preparing" also holds the legacy "confirmed" status
export const ADMIN_ORDER_TABS = ['pending', 'preparing', 'ready_for_pickup', 'delivering', 'delivered', 'cancelled'];

export const adminOrderQuerySchema = Joi.object({
  ...pageQueryKeys,
  keyword: keywordQuery,
  status: Joi.string()
    .valid('all', ...ADMIN_ORDER_TABS)
    .default('all'),
  paymentMethod: Joi.string()
    .valid('all', ...PAYMENT_METHODS)
    .default('all'),
  // Vietnam days of the order date, both inclusive
  from: dateString,
  to: dateString.custom((value, helpers) => {
    const { from } = helpers.state.ancestors[0];
    return from && value < from ? helpers.error('date.order') : value;
  }),
}).messages({ 'date.order': 'Ngày kết thúc phải từ ngày bắt đầu trở đi' });
