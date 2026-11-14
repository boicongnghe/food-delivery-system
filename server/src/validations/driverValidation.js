import Joi from 'joi';
import { SHIPPER_WITHDRAWAL_LIMITS } from '../utils/shipperWallet.js';
import { pageQueryKeys } from './commonValidation.js';

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

// GET /api/drivers/me/withdrawals, GET /api/drivers/me/delivery-issues
export const driverPageQuerySchema = Joi.object(pageQueryKeys);

// PUT /api/drivers/me/application - same fields and rules as the shipper part of the register form
export const shipperApplicationSchema = Joi.object({
  dateOfBirth: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({ 'string.pattern.base': 'Ngày sinh không hợp lệ', 'any.required': 'Vui lòng chọn ngày sinh' }),
  citizenId: Joi.string()
    .trim()
    .pattern(/^[0-9]{9,12}$/)
    .required()
    .messages({ 'string.pattern.base': 'Số CCCD gồm 9-12 chữ số', 'any.required': 'Vui lòng nhập số CCCD' }),
  vehicleInfo: Joi.string().trim().min(3).max(200).required().messages({
    'string.empty': 'Vui lòng nhập loại xe và biển số xe',
    'string.min': 'Thông tin xe quá ngắn',
    'any.required': 'Vui lòng nhập loại xe và biển số xe',
  }),
  hasInsurance: Joi.boolean().default(false),
  insuranceInfo: Joi.string().trim().max(200).allow('').default(''),
  depositConfirmed: Joi.boolean().default(false),
  depositNote: Joi.string().trim().max(200).allow('').default(''),
});
