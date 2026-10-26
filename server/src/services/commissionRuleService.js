import CommissionRule from '../models/CommissionRule.js';
import Restaurant from '../models/Restaurant.js';
import ApiError from '../utils/ApiError.js';
import { vietnamDateString } from '../utils/date.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const NO_END = '9999-12-31';
// Reports compute past commission from the rules: these fields must not change once a rule has started
const LOCKED_AFTER_START = ['target', 'restaurant', 'rate', 'effectiveFrom'];

const refId = (value) => String(value?._id ?? value);
const formatDay = (day) => day.split('-').reverse().join('/'); // "2026-11-01" -> "01/11/2026"
const fieldError = (field, message) => new ApiError(400, 'Dữ liệu không hợp lệ', [{ field, message }]);

export const getRuleState = (rule, today) => {
  if (rule.effectiveFrom > today) return 'upcoming';
  if (rule.effectiveTo && rule.effectiveTo < today) return 'expired';
  return 'active';
};

const coversDay = (rule, day) => rule.effectiveFrom <= day && (rule.effectiveTo || NO_END) >= day;

// The rule in force on a Vietnam day: a rule for the restaurant wins over the default one
export const findApplicableRule = (rules, target, restaurantId, day) => {
  const candidates = rules.filter((rule) => rule.target === target && coversDay(rule, day));
  const ownRule =
    restaurantId && candidates.find((rule) => rule.restaurant && refId(rule.restaurant) === refId(restaurantId));
  return ownRule || candidates.find((rule) => !rule.restaurant) || null;
};

// Commission rate in percent; no rule means the platform takes nothing
export const resolveRate = (rules, target, restaurantId, day) =>
  findApplicableRule(rules, target, restaurantId, day)?.rate ?? 0;

const ensureNoOverlap = async (data, excludeId = null) => {
  const sameScope = await CommissionRule.find({
    target: data.target,
    restaurant: data.restaurant || null,
    ...(excludeId && { _id: { $ne: excludeId } }),
  }).lean();
  const conflict = sameScope.find(
    (rule) => rule.effectiveFrom <= (data.effectiveTo || NO_END) && data.effectiveFrom <= (rule.effectiveTo || NO_END),
  );
  if (conflict) {
    const period = `${formatDay(conflict.effectiveFrom)} - ${conflict.effectiveTo ? formatDay(conflict.effectiveTo) : 'không thời hạn'}`;
    throw new ApiError(409, `Trùng thời gian với quy tắc "${conflict.name}" (${period})`, [
      { field: 'effectiveFrom', message: 'Thời gian áp dụng bị trùng với quy tắc khác cùng phạm vi' },
    ]);
  }
};

const ensureRestaurantExists = async (restaurantId) => {
  if (restaurantId && !(await Restaurant.exists({ _id: restaurantId }))) {
    throw fieldError('restaurant', 'Nhà hàng không tồn tại');
  }
};

export const listCommissionRules = async () => {
  const today = vietnamDateString();
  const rules = await CommissionRule.find()
    .populate('restaurant', 'name status')
    .sort({ target: 1, effectiveFrom: -1 })
    .lean();
  return {
    today,
    items: rules.map((rule) => ({ ...rule, state: getRuleState(rule, today) })),
    // Default rules in force today (restaurant overrides are in items)
    currentDefaults: {
      restaurant: findApplicableRule(rules, 'restaurant', null, today),
      shipper: findApplicableRule(rules, 'shipper', null, today),
    },
  };
};

export const createCommissionRule = async (data) => {
  if (data.effectiveFrom < vietnamDateString()) {
    throw fieldError('effectiveFrom', 'Ngày bắt đầu không được trước hôm nay');
  }
  await ensureRestaurantExists(data.restaurant);
  await ensureNoOverlap(data);
  return CommissionRule.create(data);
};

export const updateCommissionRule = async (ruleId, data) => {
  const rule = await CommissionRule.findById(ruleId);
  if (!rule) {
    throw new ApiError(404, 'Không tìm thấy quy tắc hoa hồng');
  }
  const today = vietnamDateString();

  if (rule.effectiveFrom <= today) {
    const changedFields = LOCKED_AFTER_START.filter((field) => String(rule[field] ?? '') !== String(data[field] ?? ''));
    if (changedFields.length > 0) {
      throw new ApiError(
        409,
        'Quy tắc đã được áp dụng, chỉ được sửa tên, ghi chú và ngày kết thúc',
        changedFields.map((field) => ({ field, message: 'Không thể thay đổi khi quy tắc đã áp dụng' })),
      );
    }
    // Ending a rule in the past would also rewrite reports
    if (data.effectiveTo !== rule.effectiveTo && data.effectiveTo && data.effectiveTo < today) {
      throw fieldError('effectiveTo', 'Ngày kết thúc không được trước hôm nay');
    }
  } else if (data.effectiveFrom < today) {
    throw fieldError('effectiveFrom', 'Ngày bắt đầu không được trước hôm nay');
  }

  await ensureRestaurantExists(data.restaurant);
  await ensureNoOverlap(data, rule._id);
  Object.assign(rule, data);
  await rule.save();
  return rule;
};

export const deleteCommissionRule = async (ruleId) => {
  const rule = await CommissionRule.findById(ruleId).select('effectiveFrom').lean();
  if (!rule) {
    throw new ApiError(404, 'Không tìm thấy quy tắc hoa hồng');
  }
  if (rule.effectiveFrom <= vietnamDateString()) {
    throw new ApiError(
      409,
      'Quy tắc đã được áp dụng nên không thể xóa (để giữ đúng số liệu đối soát). Hãy đặt ngày kết thúc thay vì xóa.',
    );
  }
  await CommissionRule.deleteOne({ _id: ruleId });
};

// Restaurant picker of the rule form
export const searchRestaurants = async ({ keyword, limit }) => {
  const filter = keyword ? { name: new RegExp(escapeRegex(keyword), 'i') } : {};
  return Restaurant.find(filter).select('name status').sort({ name: 1 }).limit(limit).lean();
};
