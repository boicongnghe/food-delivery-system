import Joi from 'joi';
import {
  DELIVERY_ISSUE_STATUSES,
  DELIVERY_ISSUE_TYPES,
  ISSUE_ORDER_ACTIONS,
} from '../models/DeliveryIssue.js';
import { keywordQuery, pageQueryKeys } from './commonValidation.js';
import { evidenceImages, resolutionNote } from './complaintValidation.js';
import { penaltySchema } from './hearingValidation.js';

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
