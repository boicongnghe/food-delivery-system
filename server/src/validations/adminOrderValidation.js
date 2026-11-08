import Joi from 'joi';
import { PAYMENT_METHODS } from '../models/Order.js';
import { dateString, keywordQuery, pageQueryKeys } from './commonValidation.js';

// Tabs of the platform order list ("confirmed" = accepted by the restaurant, waiting for a shipper).
// "refund_pending": cancelled paid orders whose refund is still owed (any status).
// "attention": orders a timeout rule handed to the admin (kitchen overdue TO-05, no shipper TO-06,
// shipper accepted but not picked up after pickupWait)
export const ADMIN_ORDER_TABS = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'delivering',
  'delivered',
  'cancelled',
  'refund_pending',
  'attention',
];

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

// PATCH /api/admin/orders/:id/cancel - the admin cancels for the customer (TO-05, decision D3)
export const adminCancelOrderSchema = Joi.object({
  note: Joi.string().trim().min(5).max(300).required().messages({
    'string.empty': 'Ghi lý do hủy đơn',
    'string.min': 'Lý do hủy tối thiểu 5 ký tự',
    'string.max': 'Lý do hủy tối đa 300 ký tự',
    'any.required': 'Ghi lý do hủy đơn',
  }),
});

// PATCH /api/admin/orders/:id/release-shipper - the shipper accepted but does not pick up: find another one
export const adminReleaseShipperSchema = Joi.object({
  note: Joi.string().trim().min(5).max(300).required().messages({
    'string.empty': 'Ghi lý do đổi shipper',
    'string.min': 'Lý do đổi shipper tối thiểu 5 ký tự',
    'string.max': 'Lý do đổi shipper tối đa 300 ký tự',
    'any.required': 'Ghi lý do đổi shipper',
  }),
});

// PATCH /api/admin/orders/:id/refund - the admin records the result of the refund transfer
export const refundResolutionSchema = Joi.object({
  result: Joi.string().valid('succeeded', 'failed').required().messages({
    'any.only': 'Kết quả hoàn tiền không hợp lệ',
    'any.required': 'Vui lòng chọn kết quả hoàn tiền',
  }),
  // Bank transfer / gateway reference: the proof that the money really went back
  reference: Joi.string()
    .trim()
    .max(100)
    .when('result', { is: 'succeeded', then: Joi.required(), otherwise: Joi.allow('').default('') })
    .messages({
      'any.required': 'Nhập mã giao dịch chuyển trả để xác nhận đã hoàn tiền',
      'string.empty': 'Nhập mã giao dịch chuyển trả để xác nhận đã hoàn tiền',
      'string.max': 'Mã giao dịch tối đa 100 ký tự',
    }),
  note: Joi.string()
    .trim()
    .max(300)
    .when('result', { is: 'failed', then: Joi.required(), otherwise: Joi.allow('').default('') })
    .messages({
      'any.required': 'Ghi lý do hoàn tiền thất bại',
      'string.empty': 'Ghi lý do hoàn tiền thất bại',
      'string.max': 'Ghi chú tối đa 300 ký tự',
    }),
});
