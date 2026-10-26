import Joi from 'joi';
import {
  DELIVERY_ISSUE_STATUSES,
  DELIVERY_ISSUE_TYPES,
  PENALTY_ACTIONS,
  PENALTY_TARGETS,
} from '../models/DeliveryIssue.js';
import { keywordQuery, pageQueryKeys } from './commonValidation.js';
import { evidenceImages, issueDescription, resolutionNote } from './complaintValidation.js';

// POST /api/orders/:id/delivery-issues (shipper of the order)
export const createDeliveryIssueSchema = Joi.object({
  type: Joi.string()
    .valid(...DELIVERY_ISSUE_TYPES)
    .required()
    .messages({ 'any.only': 'Loại sự cố không hợp lệ', 'any.required': 'Vui lòng chọn loại sự cố' }),
  description: issueDescription,
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
