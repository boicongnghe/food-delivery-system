import Shipper from '../models/Shipper.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { shipperChecks } from './adminPartnerService.js';

// The shipper fixes its own profile while it is not approved yet: pending (before the review) or rejected
// (then saving sends it back for review, like a rejected restaurant saving its profile)
const EDITABLE_STATUSES = ['pending', 'rejected'];

const toApplicationView = (shipper, account) => ({
  status: shipper.status,
  // The admin's reason for the last decision (rejection, suspension); shown to the shipper
  statusNote: shipper.statusChange?.note || '',
  statusChangedAt: shipper.statusChange?.at || null,
  dateOfBirth: shipper.dateOfBirth || '',
  citizenId: shipper.citizenId || '',
  vehicleInfo: shipper.vehicleInfo || '',
  hasInsurance: Boolean(shipper.vehicleInsurance?.hasInsurance),
  insuranceInfo: shipper.vehicleInsurance?.insuranceInfo || '',
  deposit: { amount: shipper.deposit?.amount || 0, isPaid: Boolean(shipper.deposit?.isPaid) },
  checklist: shipperChecks(shipper, account),
  canEdit: EDITABLE_STATUSES.includes(shipper.status),
});

const loadApplication = async (userId) => {
  const [shipper, account] = await Promise.all([
    Shipper.findOne({ user: userId }).select('-vehicleRegistration.fileData -vehicleInsurance.fileData').lean(),
    User.findById(userId).select('isVerified').lean(),
  ]);
  if (!shipper) {
    throw new ApiError(404, 'Tài khoản chưa có hồ sơ tài xế');
  }
  return { shipper, account };
};

/** Profile, review status (with the admin's reason) and registration checklist of the logged-in shipper */
export const getMyApplication = async (userId) => {
  const { shipper, account } = await loadApplication(userId);
  return toApplicationView(shipper, account);
};

/**
 * Saves the corrected profile. A rejected profile goes back to "pending" so the admin reviews it again.
 * The admin's checklist rules are checked here too, so a resubmission that would still be refused is reported at once.
 */
export const resubmitApplication = async (userId, data) => {
  const { shipper, account } = await loadApplication(userId);
  if (!EDITABLE_STATUSES.includes(shipper.status)) {
    throw new ApiError(
      409,
      shipper.status === 'approved' ? 'Hồ sơ tài xế đã được duyệt' : 'Hồ sơ đang bị đình chỉ, vui lòng liên hệ ban quản trị',
    );
  }

  const next = {
    dateOfBirth: data.dateOfBirth,
    citizenId: data.citizenId,
    vehicleInfo: data.vehicleInfo,
    'vehicleInsurance.hasInsurance': data.hasInsurance,
    'vehicleInsurance.submitLater': !data.hasInsurance,
    'vehicleInsurance.insuranceInfo': data.hasInsurance ? data.insuranceInfo : '',
  };
  // Same confirmation as the register form: only a deposit not confirmed yet can be confirmed here
  if (!shipper.deposit?.isPaid && data.depositConfirmed) {
    next['deposit.isPaid'] = true;
    next['deposit.paidAt'] = new Date();
    if (data.depositNote) next['deposit.transactionNote'] = data.depositNote;
  }

  const preview = {
    ...shipper,
    dateOfBirth: data.dateOfBirth,
    citizenId: data.citizenId,
    vehicleInfo: data.vehicleInfo,
  };
  const ageCheck = shipperChecks(preview, account).find((check) => check.key === 'dateOfBirth');
  if (!ageCheck.ok) {
    throw new ApiError(400, 'Dữ liệu không hợp lệ', [{ field: 'dateOfBirth', message: 'Tài xế phải đủ 18 tuổi trở lên' }]);
  }

  // Conditional on the status just read: an admin deciding at the same moment wins, the shipper reloads
  const updated = await Shipper.findOneAndUpdate(
    { user: userId, status: shipper.status },
    { $set: { ...next, ...(shipper.status === 'rejected' && { status: 'pending' }) } },
    { runValidators: true },
  );
  if (!updated) {
    throw new ApiError(409, 'Hồ sơ vừa được quản trị viên cập nhật, vui lòng tải lại');
  }
  return getMyApplication(userId);
};
