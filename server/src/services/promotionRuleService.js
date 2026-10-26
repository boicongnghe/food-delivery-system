import PromotionRule from '../models/PromotionRule.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';

const IS_EXHAUSTED = { usageLimit: { $ne: null }, $expr: { $gte: ['$usedCount', '$usageLimit'] } };
const HAS_USES_LEFT = { $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] };

// Mutually exclusive, same priority as getPromotionStatus
const buildStatusFilters = (now) => ({
  all: {},
  disabled: { isActive: false },
  expired: { isActive: true, endDate: { $lt: now } },
  exhausted: { isActive: true, endDate: { $gte: now }, ...IS_EXHAUSTED },
  scheduled: { isActive: true, endDate: { $gte: now }, startDate: { $gt: now }, ...HAS_USES_LEFT },
  active: { isActive: true, endDate: { $gte: now }, startDate: { $lte: now }, ...HAS_USES_LEFT },
});

export const getPromotionStatus = (rule, now = new Date()) => {
  if (!rule.isActive) return 'disabled';
  if (rule.endDate < now) return 'expired';
  if (rule.usageLimit && rule.usedCount >= rule.usageLimit) return 'exhausted';
  if (rule.startDate > now) return 'scheduled';
  return 'active';
};

// A cap only makes sense for a percentage discount
const toRuleData = (data) => ({
  ...data,
  maxDiscount: data.discountType === 'percentage' ? (data.maxDiscount ?? null) : null,
});

const ensureUniqueCode = async (code, excludeId = null) => {
  if (await PromotionRule.exists({ code, ...(excludeId && { _id: { $ne: excludeId } }) })) {
    throw new ApiError(409, 'Mã khuyến mãi đã tồn tại', [{ field: 'code', message: `Mã ${code} đã được sử dụng` }]);
  }
};

export const listPromotionRules = async ({ page, limit, keyword, status }) => {
  const now = new Date();
  const statusFilters = buildStatusFilters(now);
  const baseFilter = keyword
    ? { $or: [{ code: new RegExp(escapeRegex(keyword), 'i') }, { title: new RegExp(escapeRegex(keyword), 'i') }] }
    : {};
  // $and keeps the keyword $or and the status $or from overwriting each other
  const filter = { $and: [baseFilter, statusFilters[status]] };

  const [items, totalItems, countEntries] = await Promise.all([
    PromotionRule.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PromotionRule.countDocuments(filter),
    Promise.all(
      Object.entries(statusFilters).map(async ([key, statusFilter]) => [
        key,
        await PromotionRule.countDocuments({ $and: [baseFilter, statusFilter] }),
      ]),
    ),
  ]);

  const rules = items.map((rule) => ({ ...rule, status: getPromotionStatus(rule, now) }));
  return { ...toPage(rules, { page, limit }, totalItems), counts: Object.fromEntries(countEntries) };
};

export const createPromotionRule = async (data) => {
  await ensureUniqueCode(data.code);
  return PromotionRule.create(toRuleData(data));
};

export const updatePromotionRule = async (ruleId, data) => {
  const rule = await PromotionRule.findById(ruleId);
  if (!rule) {
    throw new ApiError(404, 'Không tìm thấy mã khuyến mãi');
  }
  // Orders keep the code they used: renaming it would break reports
  if (rule.usedCount > 0 && data.code !== rule.code) {
    throw new ApiError(409, 'Mã đã được khách sử dụng, không thể đổi mã', [
      { field: 'code', message: `Đã dùng ${rule.usedCount} lần, hãy giữ nguyên mã ${rule.code}` },
    ]);
  }
  if (data.usageLimit && data.usageLimit < rule.usedCount) {
    throw new ApiError(400, 'Dữ liệu không hợp lệ', [
      { field: 'usageLimit', message: `Không được nhỏ hơn số lượt đã dùng (${rule.usedCount})` },
    ]);
  }
  await ensureUniqueCode(data.code, rule._id);

  Object.assign(rule, toRuleData(data));
  await rule.save();
  return rule;
};

export const deletePromotionRule = async (ruleId) => {
  const rule = await PromotionRule.findById(ruleId).select('code usedCount').lean();
  if (!rule) {
    throw new ApiError(404, 'Không tìm thấy mã khuyến mãi');
  }
  // Conditional delete: checkout may use the code between the check and the delete
  const { deletedCount } = await PromotionRule.deleteOne({ _id: ruleId, usedCount: 0 });
  if (deletedCount === 0) {
    throw new ApiError(409, `Mã ${rule.code} đã được khách sử dụng nên không thể xóa. Hãy tắt mã để ngừng áp dụng.`);
  }
};
