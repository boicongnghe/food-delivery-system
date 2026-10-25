import PromotionRule from '../models/PromotionRule.js';
import ApiError from '../utils/ApiError.js';

export const getPromotionRules = async (query = {}) => {
  const filter = {};
  if (query.activeOnly === 'true' || query.activeOnly === true) {
    const now = new Date();
    filter.isActive = true;
    filter.startDate = { $lte: now };
    filter.endDate = { $gte: now };
  }
  return PromotionRule.find(filter).sort({ createdAt: -1 });
};

export const createPromotionRule = async (data) => {
  const { code, title, description, discountType, discountValue, minOrderValue, maxDiscount, endDate, usageLimit } = data;

  if (!code || !title || !discountType || discountValue === undefined || !endDate) {
    throw new ApiError(400, 'Missing required promotion fields');
  }

  const existing = await PromotionRule.findOne({ code: code.toUpperCase() });
  if (existing) {
    throw new ApiError(409, `Promotion code '${code.toUpperCase()}' already exists`);
  }

  return PromotionRule.create({
    code: code.toUpperCase(),
    title,
    description: description || '',
    discountType,
    discountValue,
    minOrderValue: minOrderValue || 0,
    maxDiscount: maxDiscount || null,
    endDate: new Date(endDate),
    usageLimit: usageLimit || 100,
    isActive: data.isActive !== undefined ? data.isActive : true,
  });
};

export const updatePromotionRule = async (id, data) => {
  const rule = await PromotionRule.findById(id);
  if (!rule) {
    throw new ApiError(404, 'Promotion rule not found');
  }

  if (data.code && data.code.toUpperCase() !== rule.code) {
    const existing = await PromotionRule.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw new ApiError(409, `Promotion code '${data.code.toUpperCase()}' already exists`);
    }
    rule.code = data.code.toUpperCase();
  }

  if (data.title !== undefined) rule.title = data.title;
  if (data.description !== undefined) rule.description = data.description;
  if (data.discountType !== undefined) rule.discountType = data.discountType;
  if (data.discountValue !== undefined) rule.discountValue = data.discountValue;
  if (data.minOrderValue !== undefined) rule.minOrderValue = data.minOrderValue;
  if (data.maxDiscount !== undefined) rule.maxDiscount = data.maxDiscount;
  if (data.endDate !== undefined) rule.endDate = new Date(data.endDate);
  if (data.usageLimit !== undefined) rule.usageLimit = data.usageLimit;
  if (data.isActive !== undefined) rule.isActive = data.isActive;

  await rule.save();
  return rule;
};

export const deletePromotionRule = async (id) => {
  const rule = await PromotionRule.findByIdAndDelete(id);
  if (!rule) {
    throw new ApiError(404, 'Promotion rule not found');
  }
  return rule;
};

export const validateAndApplyPromotion = async (code, subtotal) => {
  if (!code) {
    return { discountAmount: 0, promotion: null };
  }

  const now = new Date();
  const rule = await PromotionRule.findOne({
    code: code.toUpperCase(),
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });

  if (!rule) {
    throw new ApiError(400, 'Mã khuyến mãi không tồn tại hoặc đã hết hạn');
  }

  if (rule.usageLimit && rule.usedCount >= rule.usageLimit) {
    throw new ApiError(400, 'Mã khuyến mãi đã hết lượt sử dụng');
  }

  if (subtotal < rule.minOrderValue) {
    throw new ApiError(
      400,
      `Đơn hàng cần tối thiểu ${rule.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này`,
    );
  }

  let discountAmount = 0;
  if (rule.discountType === 'fixed') {
    discountAmount = rule.discountValue;
  } else if (rule.discountType === 'percentage') {
    discountAmount = Math.round((subtotal * rule.discountValue) / 100);
    if (rule.maxDiscount && discountAmount > rule.maxDiscount) {
      discountAmount = rule.maxDiscount;
    }
  }

  if (discountAmount > subtotal) {
    discountAmount = subtotal;
  }

  return {
    discountAmount,
    promotion: {
      code: rule.code,
      title: rule.title,
      discountType: rule.discountType,
      discountValue: rule.discountValue,
    },
  };
};
