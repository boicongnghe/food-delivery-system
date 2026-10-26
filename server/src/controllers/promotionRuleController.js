import asyncHandler from '../utils/asyncHandler.js';
import * as promotionRuleService from '../services/promotionRuleService.js';

// UC41 - Manage promotion rules

export const listPromotionRules = asyncHandler(async (req, res) => {
  const result = await promotionRuleService.listPromotionRules(req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách mã khuyến mãi thành công',
  });
});

export const createPromotionRule = asyncHandler(async (req, res) => {
  const rule = await promotionRuleService.createPromotionRule(req.body);

  res.status(201).json({
    success: true,
    data: rule,
    message: `Đã tạo mã khuyến mãi ${rule.code}`,
  });
});

export const updatePromotionRule = asyncHandler(async (req, res) => {
  const rule = await promotionRuleService.updatePromotionRule(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: rule,
    message: `Đã cập nhật mã khuyến mãi ${rule.code}`,
  });
});

export const deletePromotionRule = asyncHandler(async (req, res) => {
  await promotionRuleService.deletePromotionRule(req.params.id);

  res.status(200).json({
    success: true,
    data: null,
    message: 'Đã xóa mã khuyến mãi',
  });
});
