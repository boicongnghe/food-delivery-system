import Joi from 'joi';
import { MIN_WITHDRAWAL_AMOUNT } from '../models/RestaurantWithdrawal.js';
import { pageQueryKeys } from './commonValidation.js';

// POST /api/restaurants/me/wallet/withdrawals
export const withdrawalSchema = Joi.object({
  amount: Joi.number()
    .integer()
    .min(MIN_WITHDRAWAL_AMOUNT)
    .max(1000000000)
    .required()
    .messages({
      'number.base': 'Số tiền rút phải là số',
      'number.integer': 'Số tiền rút phải là số nguyên (VND)',
      'number.min': `Số tiền rút tối thiểu ${MIN_WITHDRAWAL_AMOUNT.toLocaleString('vi-VN')}đ`,
      'number.max': 'Số tiền rút quá lớn',
      'any.required': 'Vui lòng nhập số tiền rút',
    }),
  // One key per withdrawal form (a UUID from the client): retries return the same withdrawal
  idempotencyKey: Joi.string().trim().min(8).max(64).required(),
});

// PUT /api/restaurants/me/wallet/payout-account - all three fields: a half-filled account cannot receive money
export const payoutAccountSchema = Joi.object({
  bankName: Joi.string().trim().min(2).max(60).required().messages({
    'string.empty': 'Vui lòng nhập ngân hàng',
    'string.min': 'Tên ngân hàng quá ngắn',
    'any.required': 'Vui lòng nhập ngân hàng',
  }),
  accountNumber: Joi.string().trim().pattern(/^\d{6,20}$/).required().messages({
    'string.empty': 'Vui lòng nhập số tài khoản',
    'string.pattern.base': 'Số tài khoản gồm 6–20 chữ số',
    'any.required': 'Vui lòng nhập số tài khoản',
  }),
  // Written exactly as on the card: capital letters without accents (banks reject other names)
  accountHolder: Joi.string().trim().uppercase().pattern(/^[A-Z][A-Z ]*$/).max(100).required().messages({
    'string.empty': 'Vui lòng nhập tên chủ tài khoản',
    'string.pattern.base': 'Tên chủ tài khoản viết hoa không dấu, chỉ gồm chữ cái và khoảng trắng',
    'any.required': 'Vui lòng nhập tên chủ tài khoản',
  }),
});

// GET /api/restaurants/me/wallet/withdrawals
export const withdrawalQuerySchema = Joi.object({ ...pageQueryKeys });

// POST /api/webhooks/payouts - result of a transfer sent by the payout gateway
export const payoutWebhookSchema = Joi.object({
  reference: Joi.string().trim().max(30).required(), // withdrawal code, e.g. RT-0001
  status: Joi.string().valid('succeeded', 'failed').required(),
  providerRef: Joi.string().trim().max(100).allow('').default(''),
  failureReason: Joi.string().trim().max(300).allow('').default(''),
});
