import Joi from 'joi';
import { SHIPPER_WITHDRAWAL_LIMITS } from '../utils/shipperWallet.js';

export const requestWithdrawalSchema = Joi.object({
  amount: Joi.number()
    .integer()
    .min(SHIPPER_WITHDRAWAL_LIMITS.minimum)
    .max(SHIPPER_WITHDRAWAL_LIMITS.perWithdrawal)
    .required(),
});

export const updateDriverSettingsSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100),
  phone: Joi.string().trim().max(20).allow(''),
  avatarUrl: Joi.string().trim().max(500).uri({ scheme: ['http', 'https'] }).allow(''),
  // Bank accounts are managed in the wallet (POST /api/wallet/payout-accounts), no longer here
}).min(1);

export const changeDriverPasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Vui lòng nhập mật khẩu hiện tại',
    'any.required': 'Vui lòng nhập mật khẩu hiện tại',
  }),
  newPassword: Joi.string().min(6).max(128).required().messages({
    'string.empty': 'Vui lòng nhập mật khẩu mới',
    'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự',
    'any.required': 'Vui lòng nhập mật khẩu mới',
  }),
});
