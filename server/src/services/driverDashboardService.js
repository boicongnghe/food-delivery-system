import DriverDashboard from '../models/DriverDashboard.js';
import Shipper from '../models/Shipper.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const VALID_PERIODS = new Set(['today', 'week', 'month']);

const validatePeriod = (period) => {
  if (!VALID_PERIODS.has(period)) {
    throw new ApiError(400, 'Period must be today, week, or month');
  }
};

const getOrCreateDashboard = async (userId) => {
  const user = await User.findById(userId).select('fullName avatar role').lean();
  if (!user) {
    throw new ApiError(404, 'Driver account was not found');
  }
  if (user.role !== 'shipper') {
    throw new ApiError(403, 'Only shipper accounts can access driver settings');
  }

  return DriverDashboard.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        profile: {
          name: user.fullName,
          driverCode: `TX-${userId.toString().slice(-6).toUpperCase()}`,
          avatarUrl: user.avatar,
        },
        periods: { today: {}, week: {}, month: {} },
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
};

const getDashboard = async (userId, period) => {
  validatePeriod(period);

  const [dashboard, user, shipper] = await Promise.all([
    getOrCreateDashboard(userId),
    User.findById(userId).select('fullName phone avatar').lean(),
    Shipper.findOne({ user: userId }).select('citizenId vehicleInfo status').lean(),
  ]);
  if (!dashboard.periods?.[period]) {
    throw new ApiError(404, 'Driver dashboard data was not found');
  }

  const { bankAccountNumber, ...dashboardProfile } = dashboard.profile;

  return {
    profile: {
      ...dashboardProfile,
      name: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatar,
      ...(shipper && {
        vehicle: shipper.vehicleInfo,
        licensePlate: '',
      }),
    },
    isOnline: dashboard.isOnline,
    isDemo: dashboard.isDemo,
    updatedAt: dashboard.updatedAt,
    ...dashboard.periods[period],
    payoutBank: dashboard.profile.bankName
      ? `${dashboard.profile.bankName} · ****${(bankAccountNumber || '').slice(-4)}`
      : dashboard.periods[period].payoutBank,
  };
};

const getSettings = async (userId) => {
  const [user, dashboard, shipper] = await Promise.all([
    User.findById(userId).select('fullName email phone avatar').lean(),
    getOrCreateDashboard(userId),
    Shipper.findOne({ user: userId }).select('citizenId vehicleInfo status').lean(),
  ]);

  if (!user) {
    throw new ApiError(404, 'Driver account was not found');
  }

  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar,
    citizenIdMasked: shipper?.citizenId
      ? `${'*'.repeat(Math.max(0, shipper.citizenId.length - 4))}${shipper.citizenId.slice(-4)}`
      : '',
    vehicleInfo: shipper?.vehicleInfo || '',
    shipperStatus: shipper?.status || '',
    bankName: dashboard.profile.bankName,
    bankAccountName: dashboard.profile.bankAccountName,
    bankAccountNumber: dashboard.profile.bankAccountNumber,
  };
};

const updateSettings = async (userId, settings) => {
  const [user, dashboard, shipper] = await Promise.all([
    User.findById(userId),
    getOrCreateDashboard(userId),
    Shipper.findOne({ user: userId }).select('vehicleInfo').lean(),
  ]);

  if (!user) {
    throw new ApiError(404, 'Driver account was not found');
  }
  if (!dashboard) {
    throw new ApiError(404, 'Driver dashboard data was not found');
  }

  const userFields = {
    fullName: 'fullName',
    phone: 'phone',
    avatarUrl: 'avatar',
  };
  const profileFields = {
    fullName: 'name',
    phone: 'phone',
    avatarUrl: 'avatarUrl',
    bankName: 'bankName',
    bankAccountName: 'bankAccountName',
    bankAccountNumber: 'bankAccountNumber',
  };

  for (const [inputField, userField] of Object.entries(userFields)) {
    if (settings[inputField] !== undefined) {
      user[userField] = settings[inputField];
    }
  }
  for (const [inputField, profileField] of Object.entries(profileFields)) {
    if (settings[inputField] !== undefined) {
      dashboard.profile[profileField] = settings[inputField];
    }
  }

  await user.save();
  await DriverDashboard.updateOne(
    { userId },
    { $set: { profile: dashboard.profile } },
    { runValidators: true },
  );

  const { bankAccountNumber, ...dashboardProfile } = dashboard.profile;
  const profile = {
    ...dashboardProfile,
    ...(shipper && {
      vehicle: shipper.vehicleInfo,
      licensePlate: '',
    }),
  };

  return {
    profile,
    payoutBank: dashboard.profile.bankName
      ? `${dashboard.profile.bankName} · ****${(bankAccountNumber || '').slice(-4)}`
      : 'Chưa thiết lập',
  };
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'Driver account was not found');
  }

  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new ApiError(400, 'Mật khẩu hiện tại không chính xác');
  }
  if (currentPassword === newPassword) {
    throw new ApiError(400, 'Mật khẩu mới phải khác mật khẩu hiện tại');
  }

  user.password = newPassword;
  await user.save();

  return { message: 'Đổi mật khẩu thành công' };
};

const updateOnlineStatus = async (userId, isOnline) => {
  await getOrCreateDashboard(userId);
  const updatedDashboard = await DriverDashboard.findOneAndUpdate(
    { userId },
    { $set: { isOnline } },
    { new: true, runValidators: true, projection: { isOnline: 1 } },
  ).lean();

  if (!updatedDashboard) {
    throw new ApiError(404, 'Driver dashboard data was not found');
  }

  return { isOnline: updatedDashboard.isOnline };
};

const driverDashboardService = {
  getDashboard,
  getSettings,
  updateSettings,
  changePassword,
  updateOnlineStatus,
};

export default driverDashboardService;
