import mongoose from 'mongoose';

/**
 * Order timeout rules (TO-01..TO-16, see docs/order-timeouts.md). One document, _id "order-timeouts".
 * All values in minutes except refundSlaHours. Defaults are the BA assumptions (SRS > Assumptions).
 */
export const ORDER_TIMEOUT_KEY = 'order-timeouts';
export const ORDER_TIMEOUT_DEFAULTS = {
  payTimeout: 15, // TO-01 - payment module
  acceptRemind: 2, // TO-02
  acceptTimeout: 5, // TO-03
  defaultPrepTime: 15, // TO-04 - used when a restaurant has not declared its own prepTime
  prepGrace: 15, // TO-05
  shipperRemind: 10, // TO-06
  shipperTimeout: 20, // TO-07
  pickupWait: 30, // TO-08 - shipper module
  closingCutoff: 30, // TO-10
  reconInterval: 15, // TO-16 - payment module
  refundSlaHours: 24, // TO-11..TO-14
};

const platformSettingSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    ...Object.fromEntries(
      Object.entries(ORDER_TIMEOUT_DEFAULTS).map(([field, value]) => [field, { type: Number, min: 0, default: value }]),
    ),
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'platform_settings' },
);

const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);

export default PlatformSetting;
