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

// What a customer was promised once the code could be applied: changing it would treat customers
// of the same code differently and confuse anyone on the checkout page right now
const LOCKED_TERMS = ['discountType', 'discountValue', 'maxDiscount', 'minOrderValue', 'startDate'];
const TERM_LABELS = {
  discountType: 'Loại giảm giá',
  discountValue: 'Mức giảm',
  maxDiscount: 'Giảm tối đa',
  minOrderValue: 'Giá trị đơn tối thiểu',
  startDate: 'Thời gian bắt đầu',
};

const fieldError = (field, message) => new ApiError(400, 'Dữ liệu không hợp lệ', [{ field, message }]);

const sameValue = (a, b) =>
  a instanceof Date || b instanceof Date ? new Date(a).getTime() === new Date(b).getTime() : (a ?? null) === (b ?? null);

// A code is "in use" once it started or a customer applied it
const isInUse = (rule, now) => rule.usedCount > 0 || rule.startDate <= now;

// Checkout caps a discount at the food subtotal: without a floor a fixed code makes small orders free
const ensureMinOrderCoversDiscount = (data) => {
  if (data.discountType === 'fixed' && data.minOrderValue < data.discountValue) {
    throw fieldError('minOrderValue', 'Với mã giảm số tiền cố định, giá trị đơn tối thiểu phải từ mức giảm trở lên');
  }
};

const ensureFutureEndDate = (endDate, now) => {
  if (endDate <= now) {
    throw fieldError('endDate', 'Thời gian kết thúc phải ở tương lai (muốn ngừng ngay, hãy tắt mã)');
  }
};

export const createPromotionRule = async (data) => {
  ensureMinOrderCoversDiscount(data);
  ensureFutureEndDate(data.endDate, new Date());
  await ensureUniqueCode(data.code);
  return PromotionRule.create(toRuleData(data));
};

export const updatePromotionRule = async (ruleId, data) => {
  const rule = await PromotionRule.findById(ruleId).lean();
  if (!rule) {
    throw new ApiError(404, 'Không tìm thấy mã khuyến mãi');
  }
  const now = new Date();
  const next = toRuleData(data);
  const isCodeChanged = next.code !== rule.code;

  // Orders keep the code they used: renaming it would break reports
  if (rule.usedCount > 0 && isCodeChanged) {
    throw new ApiError(409, 'Mã đã được khách sử dụng, không thể đổi mã', [
      { field: 'code', message: `Đã dùng ${rule.usedCount} lần, hãy giữ nguyên mã ${rule.code}` },
    ]);
  }
  const isLocked = isInUse(rule, now);
  if (isLocked) {
    const changedTerms = LOCKED_TERMS.filter((field) => !sameValue(rule[field], next[field]));
    if (changedTerms.length > 0) {
      throw new ApiError(
        409,
        'Mã đã bắt đầu áp dụng: chỉ được sửa tên, mô tả, thời gian kết thúc, số lượt và bật / tắt',
        changedTerms.map((field) => ({ field, message: `Không thể đổi ${TERM_LABELS[field].toLowerCase()} khi mã đang áp dụng` })),
      );
    }
  } else {
    ensureMinOrderCoversDiscount(next);
  }
  // Only a new end date must be in the future: an expired code can still be renamed or turned off
  if (!sameValue(rule.endDate, next.endDate)) {
    ensureFutureEndDate(next.endDate, now);
  }
  if (next.usageLimit && next.usageLimit < rule.usedCount) {
    throw fieldError('usageLimit', `Không được nhỏ hơn số lượt đã dùng (${rule.usedCount})`);
  }
  await ensureUniqueCode(next.code, rule._id);

  // Checkout may use the code while the admin edits it: the checks above must still hold when saving
  const guard = { _id: rule._id };
  if (isCodeChanged || !isLocked) guard.usedCount = 0;
  if (next.usageLimit) guard.$expr = { $lte: ['$usedCount', next.usageLimit] };

  const updated = await PromotionRule.findOneAndUpdate(guard, { $set: next }, { returnDocument: 'after', runValidators: true });
  if (!updated) {
    throw new ApiError(409, 'Mã vừa được khách sử dụng trong lúc bạn sửa, vui lòng tải lại và thử lại');
  }
  return updated;
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
