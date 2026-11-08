import DriverDashboard from '../models/DriverDashboard.js';
import Review from '../models/Review.js';
import Shipper from '../models/Shipper.js';
import ShipperWithdrawal from '../models/ShipperWithdrawal.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { addDays, startOfVietnamDay, vietnamDateString } from '../utils/date.js';
import { SHIPPER_WITHDRAWAL_LIMITS } from '../utils/shipperWallet.js';

const VALID_PERIODS = new Set(['today', 'week', 'month']);

const getWithdrawalLimits = async (shipperId) => {
  const day = vietnamDateString();
  const [result] = await ShipperWithdrawal.aggregate([
    {
      $match: {
        shipper: shipperId,
        createdAt: { $gte: startOfVietnamDay(day), $lt: startOfVietnamDay(addDays(day, 1)) },
      },
    },
    { $group: { _id: null, amount: { $sum: '$amount' } } },
  ]);
  const dailyUsed = result?.amount || 0;
  return {
    minimum: SHIPPER_WITHDRAWAL_LIMITS.minimum,
    perWithdrawal: SHIPPER_WITHDRAWAL_LIMITS.perWithdrawal,
    daily: SHIPPER_WITHDRAWAL_LIMITS.daily,
    dailyUsed,
    dailyRemaining: Math.max(0, SHIPPER_WITHDRAWAL_LIMITS.daily - dailyUsed),
  };
};

const emptyDashboardPeriod = () => ({
  totalEarnings: 0,
  baseFare: 0,
  bonus: 0,
  tips: 0,
  completedTrips: 0,
  tripGoal: 0,
  walletBalance: 0,
  pendingBalance: 0,
  weeklyEarnings: 0,
  rating: 0,
  tier: '',
  ratingCount: 0,
  consecutiveFiveStarTrips: 0,
  payoutBank: '',
  earningsByHour: [],
  forecast: [],
  trips: [],
  missions: [],
  reviews: [],
  badges: [],
  hotspots: [],
});

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
        walletBalance: 0,
        periods: { today: {}, week: {}, month: {} },
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
};

const getDashboard = async (userId, period) => {
  validatePeriod(period);

  const [dashboard, user, shipper, ratingCount, withdrawalLimits] = await Promise.all([
    getOrCreateDashboard(userId),
    User.findById(userId).select('fullName phone avatar').lean(),
    Shipper.findOne({ user: userId }).select('citizenId vehicleInfo status rating').lean(),
    Review.countDocuments({ shipper: userId, isHidden: false, shipperRating: { $ne: null } }),
    getWithdrawalLimits(userId),
  ]);
  if (!dashboard.periods?.[period]) {
    throw new ApiError(404, 'Driver dashboard data was not found');
  }

  const { bankAccountNumber, ...dashboardProfile } = dashboard.profile;
  const periodData = dashboard.isDemo ? emptyDashboardPeriod() : dashboard.periods[period];
  if (dashboard.walletBalance == null) {
    dashboard.walletBalance = Number(dashboard.periods.today?.walletBalance || 0);
    await DriverDashboard.updateOne(
      { userId, walletBalance: null },
      { $set: { walletBalance: dashboard.walletBalance } },
    );
  }

  return {
    profile: {
      ...dashboardProfile,
      name: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatar,
      ...(dashboard.isDemo && { tier: '' }),
      ...(shipper && {
        vehicle: shipper.vehicleInfo,
        licensePlate: '',
      }),
    },
    isOnline: dashboard.isOnline,
    updatedAt: dashboard.updatedAt,
    ...periodData,
    walletBalance: dashboard.walletBalance,
    withdrawalLimits,
    ...(shipper && {
      rating: shipper.rating,
      ratingCount,
    }),
    payoutBank: dashboard.profile.bankName
      ? `${dashboard.profile.bankName} · ****${(bankAccountNumber || '').slice(-4)}`
      : periodData.payoutBank,
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
  if (isOnline) {
    const shipper = await Shipper.findOne({ user: userId }).select('status').lean();
    if (shipper?.status !== 'approved') {
      throw new ApiError(403, 'Hồ sơ tài xế cần được duyệt trước khi bật trạng thái trực tuyến');
    }
  }

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
