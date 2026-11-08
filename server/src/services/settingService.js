import PlatformSetting, { ORDER_TIMEOUT_DEFAULTS, ORDER_TIMEOUT_KEY } from '../models/PlatformSetting.js';

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
