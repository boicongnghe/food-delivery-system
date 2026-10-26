import asyncHandler from '../utils/asyncHandler.js';
import * as promotionService from '../services/promotionService.js';

export const getPromotionRules = asyncHandler(async (req, res) => {
  const rules = await promotionService.getPromotionRules(req.query);
  res.status(200).json({
    success: true,
    data: rules,
    message: 'Danh sách mã khuyến mãi',
  });
});

export const createPromotionRule = asyncHandler(async (req, res) => {
  const rule = await promotionService.createPromotionRule(req.body);
  res.status(201).json({
    success: true,
    data: rule,
    message: 'Tạo mã khuyến mãi thành công',
  });
});

export const updatePromotionRule = asyncHandler(async (req, res) => {
  const rule = await promotionService.updatePromotionRule(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: rule,
    message: 'Cập nhật mã khuyến mãi thành công',
  });
});

export const deletePromotionRule = asyncHandler(async (req, res) => {
  await promotionService.deletePromotionRule(req.params.id);
  res.status(200).json({
    success: true,
    data: null,
    message: 'Xóa mã khuyến mãi thành công',
  });
});

export const applyPromotion = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const result = await promotionService.validateAndApplyPromotion(code, Number(subtotal));
  res.status(200).json({
    success: true,
    data: result,
    message: 'Áp dụng mã khuyến mãi thành công',
  });
});
