import Joi from 'joi';
import { keywordQuery, pageQueryKeys } from './commonValidation.js';

export const USER_ROLES = ['customer', 'restaurant_owner', 'shipper', 'admin'];

export const adminUserQuerySchema = Joi.object({
  ...pageQueryKeys,
  keyword: keywordQuery,
  role: Joi.string()
    .valid('all', ...USER_ROLES)
    .default('all'),
  status: Joi.string().valid('all', 'active', 'locked').default('all'),
});

export const updateUserRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...USER_ROLES)
    .required()
    .messages({ 'any.only': 'Vai trò không hợp lệ', 'any.required': 'Vui lòng chọn vai trò' }),
});

export const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean().required().messages({ 'any.required': 'Thiếu trạng thái tài khoản' }),
});
