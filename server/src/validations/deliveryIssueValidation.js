import Joi from 'joi';
import {
  DELIVERY_ISSUE_STATUSES,
  DELIVERY_ISSUE_TYPES,
  HEARING_MAX_HOURS,
  ISSUE_ORDER_ACTIONS,
  PENALTY_ACTIONS,
  PENALTY_TARGETS,
} from '../models/DeliveryIssue.js';
import { keywordQuery, pageQueryKeys } from './commonValidation.js';
import { evidenceImages, resolutionNote } from './complaintValidation.js';

// POST /api/orders/:id/delivery-issues (shipper of the order)
export const createDeliveryIssueSchema = Joi.object({
  type: Joi.string()
    .valid(...DELIVERY_ISSUE_TYPES)
    .required()
    .messages({ 'any.only': 'Loại sự cố không hợp lệ', 'any.required': 'Vui lòng chọn loại sự cố' }),
  description: Joi.string().trim().max(1000).allow('').default(''),
  images: evidenceImages,
});

export const adminDeliveryIssueQuerySchema = Joi.object({
  ...pageQueryKeys,
  keyword: keywordQuery,
  status: Joi.string()
    .valid('all', ...DELIVERY_ISSUE_STATUSES)
    .default('open'),
  type: Joi.string()
    .valid('all', ...DELIVERY_ISSUE_TYPES)
    .default('all'),
});

const penaltySchema = Joi.object({
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
    then: Joi.number().integer().min(10000).max(5000000).required(),
    otherwise: Joi.any().strip(),
  }).messages({
    'number.base': 'Số tiền phạt phải là số',
    'number.min': 'Số tiền phạt tối thiểu 10.000đ',
    'number.max': 'Số tiền phạt tối đa 5.000.000đ',
    'any.required': 'Vui lòng nhập số tiền phạt',
  }),
});

// PATCH /api/admin/delivery-issues/:id/resolution - a penalty is only possible when the report is upheld
// (and, checked in the service, once the hearing has ended). The order is handled apart: /order-action
export const resolveDeliveryIssueSchema = Joi.object({
  decision: Joi.string()
    .valid('resolved', 'dismissed')
    .required()
    .messages({ 'any.only': 'Quyết định không hợp lệ', 'any.required': 'Vui lòng chọn cách xử lý' }),
  note: resolutionNote,
  penalty: Joi.when('decision', {
    is: 'resolved',
    then: penaltySchema.allow(null).default(null),
    otherwise: Joi.any().strip(),
  }),
});

// PATCH /api/admin/delivery-issues/:id/order-action - right away, the order cannot wait for the hearing
export const issueOrderActionSchema = Joi.object({
  orderAction: Joi.string()
    .valid(...ISSUE_ORDER_ACTIONS.filter((action) => action !== 'none'))
    .required()
    .messages({ 'any.only': 'Cách xử lý đơn hàng không hợp lệ', 'any.required': 'Vui lòng chọn cách xử lý đơn hàng' }),
  note: resolutionNote,
});

// PATCH /api/admin/delivery-issues/:id/hearing
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

// POST /api/delivery-issues/:id/messages and /api/admin/delivery-issues/:id/messages
export const hearingMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(1000).required().messages({
    'string.empty': 'Tin nhắn không được để trống',
    'string.max': 'Tin nhắn không được vượt quá 1000 ký tự',
    'any.required': 'Vui lòng nhập tin nhắn',
  }),
});

// GET /api/delivery-issues/me/hearings
export const myHearingQuerySchema = Joi.object({ ...pageQueryKeys });
