import asyncHandler from '../utils/asyncHandler.js';
import * as promotionService from '../services/promotionService.js';

export const getPromotionRules = asyncHandler(async (req, res) => {
  const rules = await promotionService.getPromotionRules();
  res.status(200).json({
    success: true,
    data: rules,
    message: 'Danh sách mã khuyến mãi',
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
