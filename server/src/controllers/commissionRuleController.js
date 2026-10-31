import asyncHandler from '../utils/asyncHandler.js';
import * as commissionRuleService from '../services/commissionRuleService.js';

// UC40 - Manage commission rules

export const listCommissionRules = asyncHandler(async (req, res) => {
  const result = await commissionRuleService.listCommissionRules();

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách quy tắc hoa hồng thành công',
  });
});

export const createCommissionRule = asyncHandler(async (req, res) => {
  const rule = await commissionRuleService.createCommissionRule(req.body);

  res.status(201).json({
    success: true,
    data: rule,
    message: 'Đã tạo quy tắc hoa hồng',
  });
});

export const updateCommissionRule = asyncHandler(async (req, res) => {
  const rule = await commissionRuleService.updateCommissionRule(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: rule,
    message: 'Đã cập nhật quy tắc hoa hồng',
  });
});

export const deleteCommissionRule = asyncHandler(async (req, res) => {
  await commissionRuleService.deleteCommissionRule(req.params.id);

  res.status(200).json({
    success: true,
    data: null,
    message: 'Đã xóa quy tắc hoa hồng',
  });
});
