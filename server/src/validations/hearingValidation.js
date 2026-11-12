import Joi from 'joi';
import { HEARING_MAX_HOURS, PENALTY_ACTIONS, PENALTY_FINE_LIMITS, PENALTY_TARGETS } from '../models/DeliveryIssue.js';
import { HEARING_MESSAGE_MAX_LENGTH } from '../models/HearingMessage.js';
import { pageQueryKeys } from './commonValidation.js';

// Shared by delivery issues (UC45) and complaints (UC42): hearing between the parties and the penalty after it

const formatVnd = (amount) => `${amount.toLocaleString('vi-VN')}đ`;

// Penalty of one party, part of a resolution body. Allowed only once the hearing has ended (checked in the service)
export const penaltySchema = Joi.object({
  target: Joi.string()
    .valid(...PENALTY_TARGETS)
    .required()
    .messages({ 'any.only': 'Đối tượng xử phạt không hợp lệ', 'any.required': 'Vui lòng chọn đối tượng xử phạt' }),
  action: Joi.string()
    .valid(...PENALTY_ACTIONS)
    .required()
    .messages({ 'any.only': 'Hình thức xử phạt không hợp lệ', 'any.required': 'Vui lòng chọn hình thức xử phạt' }),
  fineAmount: Joi.when('action', {
    is: 'fine',
    then: Joi.number().integer().min(PENALTY_FINE_LIMITS.min).max(PENALTY_FINE_LIMITS.max).required(),
    otherwise: Joi.any().strip(),
  }).messages({
    'number.base': 'Số tiền phạt phải là số',
    'number.min': `Số tiền phạt tối thiểu ${formatVnd(PENALTY_FINE_LIMITS.min)}`,
    'number.max': `Số tiền phạt tối đa ${formatVnd(PENALTY_FINE_LIMITS.max)}`,
    'any.required': 'Vui lòng nhập số tiền phạt',
  }),
});

// PATCH /api/admin/delivery-issues/:id/hearing, /api/admin/complaints/:id/hearing
export const openHearingSchema = Joi.object({
  deadlineHours: Joi.number()
    .integer()
    .min(1)
    .max(HEARING_MAX_HOURS)
    .default(HEARING_MAX_HOURS)
    .messages({
      'number.base': 'Thời hạn đối chất phải là số giờ',
      'number.min': 'Thời hạn đối chất tối thiểu 1 giờ',
      'number.max': `Thời hạn đối chất tối đa ${HEARING_MAX_HOURS} giờ`,
    }),
});

// POST /api/hearings/:caseType/:id/messages and the admin equivalents
export const hearingMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(HEARING_MESSAGE_MAX_LENGTH).required().messages({
    'string.empty': 'Tin nhắn không được để trống',
    'string.max': `Tin nhắn không được vượt quá ${HEARING_MESSAGE_MAX_LENGTH} ký tự`,
    'any.required': 'Vui lòng nhập tin nhắn',
  }),
});

// GET /api/hearings/me
export const myHearingQuerySchema = Joi.object({ ...pageQueryKeys });
