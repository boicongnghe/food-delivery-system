import mongoose from 'mongoose';

/**
 * Violation policy of the platform. One document, _id "default".
 * autoSuspendThreshold: penalties (delivery issue reports, UC45) an account may collect since its last suspension
 * before the platform suspends it automatically. 0 turns the automatic suspension off.
 */
export const VIOLATION_SETTING_KEY = 'default';
export const VIOLATION_SETTING_DEFAULTS = {
  autoSuspendThreshold: 3,
};

const violationSettingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: VIOLATION_SETTING_KEY },
    autoSuspendThreshold: { type: Number, min: 0, default: VIOLATION_SETTING_DEFAULTS.autoSuspendThreshold },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'violation_settings' },
);

const ViolationSetting = mongoose.model('ViolationSetting', violationSettingSchema);

export default ViolationSetting;
