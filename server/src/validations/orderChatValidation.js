import Joi from 'joi';
import { objectId } from './commonValidation.js';

export const orderChatParamsSchema = Joi.object({
  orderId: objectId.required(),
});

export const createOrderMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required().messages({
    'string.empty': 'Tin nhắn không được để trống',
    'string.max': 'Tin nhắn không được vượt quá 1000 ký tự',
    'any.required': 'Vui lòng nhập tin nhắn',
  }),
});
