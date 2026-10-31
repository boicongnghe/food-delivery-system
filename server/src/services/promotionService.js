import PromotionRule from '../models/PromotionRule.js';
import ApiError from '../utils/ApiError.js';

// Public fields only: checkout suggests codes, it must not see usage counters or disabled / future codes
const PUBLIC_FIELDS = 'code title description discountType discountValue minOrderValue maxDiscount endDate';

// Codes a customer can apply right now (same conditions as validateAndApplyPromotion)
export const getPromotionRules = async () => {
  const now = new Date();
  return PromotionRule.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
  })
    .select(PUBLIC_FIELDS)
    .sort({ endDate: 1 })
    .lean();
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
