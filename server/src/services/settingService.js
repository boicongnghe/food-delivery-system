import PlatformSetting, { ORDER_TIMEOUT_DEFAULTS, ORDER_TIMEOUT_KEY } from '../models/PlatformSetting.js';
import ViolationSetting, { VIOLATION_SETTING_DEFAULTS, VIOLATION_SETTING_KEY } from '../models/ViolationSetting.js';

// The job runs every minute and checkout reads the cutoff on every order: keep the values in memory briefly
const CACHE_MS = 30 * 1000;
const SETTING_FIELDS = Object.keys(ORDER_TIMEOUT_DEFAULTS);
let cache = { value: null, at: 0 };

const pickSettings = (doc) =>
  Object.fromEntries(SETTING_FIELDS.map((field) => [field, doc?.[field] ?? ORDER_TIMEOUT_DEFAULTS[field]]));

// Current order timeout settings (defaults until an admin saves them once)
export const getOrderTimeouts = async () => {
  if (cache.value && Date.now() - cache.at < CACHE_MS) return cache.value;
  const doc = await PlatformSetting.findById(ORDER_TIMEOUT_KEY).lean();
  cache = { value: pickSettings(doc), at: Date.now() };
  return cache.value;
};

// Admin screen: values + who changed them last
export const getOrderTimeoutSettings = async () => {
  const doc = await PlatformSetting.findById(ORDER_TIMEOUT_KEY).populate('updatedBy', 'fullName').lean();
  return {
    values: pickSettings(doc),
    defaults: ORDER_TIMEOUT_DEFAULTS,
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updatedBy?.fullName || null,
  };
};

export const updateOrderTimeouts = async (adminId, values) => {
  await PlatformSetting.findByIdAndUpdate(
    ORDER_TIMEOUT_KEY,
    { $set: { ...values, updatedBy: adminId } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  cache = { value: null, at: 0 }; // new values apply from the next job run / order
  return getOrderTimeoutSettings();
};

// ---------- Violation policy (automatic suspension) ----------

const VIOLATION_FIELDS = Object.keys(VIOLATION_SETTING_DEFAULTS);

const pickViolationSettings = (doc) =>
  Object.fromEntries(VIOLATION_FIELDS.map((field) => [field, doc?.[field] ?? VIOLATION_SETTING_DEFAULTS[field]]));

// Read when an admin penalizes an account: rare, no cache needed
export const getViolationPolicy = async () =>
  pickViolationSettings(await ViolationSetting.findById(VIOLATION_SETTING_KEY).lean());

export const getViolationPolicySettings = async () => {
  const doc = await ViolationSetting.findById(VIOLATION_SETTING_KEY).populate('updatedBy', 'fullName').lean();
  return {
    values: pickViolationSettings(doc),
    defaults: VIOLATION_SETTING_DEFAULTS,
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updatedBy?.fullName || null,
  };
};

// Applies to the next penalty; accounts already over the new threshold are not suspended retroactively
export const updateViolationPolicy = async (adminId, values) => {
  await ViolationSetting.findByIdAndUpdate(
    VIOLATION_SETTING_KEY,
    { $set: { ...values, updatedBy: adminId } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return getViolationPolicySettings();
};
