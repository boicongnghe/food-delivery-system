import mongoose from 'mongoose';
import DriverDashboard from '../models/DriverDashboard.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Shipper from '../models/Shipper.js';
import ShipperWithdrawal from '../models/ShipperWithdrawal.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { addDays, mondayOf, startOfVietnamDay, vietnamDateString } from '../utils/date.js';
import { SHIPPER_WITHDRAWAL_LIMITS } from '../utils/shipperWallet.js';
import { getUserDefaultAccount, maskAccountNumber } from './payoutAccountService.js';

// "Vietcombank · **** 4567": the default bank account saved in the wallet (withdrawals go there)
const payoutBankLabel = (account) => (account ? `${account.bankName} · ${maskAccountNumber(account.accountNumber)}` : 'Chưa thiết lập');

const VALID_PERIODS = new Set(['today', 'week', 'month']);

const getNextMonth = (date) => {
  const nextMonth = new Date(`${date}T00:00:00.000Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return nextMonth.toISOString().slice(0, 10);
};

const getPeriodRange = (period, today = vietnamDateString()) => {
  if (period === 'today') {
    return { from: today, to: addDays(today, 1) };
  }
  if (period === 'week') {
    const from = mondayOf(today);
    return { from, to: addDays(from, 7) };
  }
  const from = `${today.slice(0, 7)}-01`;
  return { from, to: getNextMonth(from) };
};

const getDeliveredAt = (order) => order.payoutCreditedAt
  || (order.statusHistory || []).filter((entry) => entry.status === 'delivered').at(-1)?.at;

const getWithdrawalLimits = async (shipperId) => {
  const day = vietnamDateString();
  const [result] = await ShipperWithdrawal.aggregate([
    {
      $match: {
        shipper: new mongoose.Types.ObjectId(shipperId),
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
  completedTrips: 0,
  tripGoal: 0,
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
  reviews: [],
  badges: [],
});

const withoutEarningAddOns = (entries = []) => entries.map((entry) => {
  const result = { ...entry };
  delete result.tip;
  delete result.tips;
  return result;
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
  const { from, to } = getPeriodRange(period);
  const periodDates = {
    $gte: startOfVietnamDay(from),
    $lt: startOfVietnamDay(to),
  };

  const [dashboard, user, shipper, ratingSummary, withdrawalLimits, orders, reviews] = await Promise.all([
    getOrCreateDashboard(userId),
    User.findById(userId).select('fullName phone avatar').lean(),
    Shipper.findOne({ user: userId }).select('citizenId vehicleInfo status').lean(),
    Review.aggregate([
      {
        $match: {
          shipper: new mongoose.Types.ObjectId(userId),
          isHidden: false,
          shipperRating: { $ne: null },
          createdAt: periodDates,
        },
      },
      { $group: { _id: null, average: { $avg: '$shipperRating' }, count: { $sum: 1 } } },
    ]),
    getWithdrawalLimits(userId),
    Order.find({
      shipper: userId,
      status: 'delivered',
      $or: [
        { payoutCreditedAt: periodDates },
        {
          payoutCreditedAt: null,
          statusHistory: { $elemMatch: { status: 'delivered', at: periodDates } },
        },
      ],
    })
      .select('orderCode orderNumber delivery.address shippingFee payoutCreditedAt statusHistory')
      .populate('restaurant', 'name')
      .sort({ payoutCreditedAt: -1 })
      .lean(),
    Review.find({
      shipper: userId,
      isHidden: false,
      shipperRating: { $ne: null },
      createdAt: periodDates,
    })
      .select('shipperComment shipperRating createdAt')
      .populate('customer', 'fullName')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);
  const defaultAccount = await getUserDefaultAccount(userId);
  if (!dashboard.periods?.[period]) {
    throw new ApiError(404, 'Driver dashboard data was not found');
  }

  const { bankAccountNumber, ...dashboardProfile } = dashboard.profile;
  const periodData = dashboard.isDemo ? emptyDashboardPeriod() : dashboard.periods[period];
  const tripEntries = orders.map((order) => {
    const deliveredAt = getDeliveredAt(order);
    return {
      id: order.orderCode || order.orderNumber || order._id.toString(),
      time: deliveredAt.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }),
      restaurant: order.restaurant?.name || 'Quán ăn',
      address: order.delivery?.address || '',
      distance: '',
      baseFare: Number(order.shippingFee || 0),
      bonus: 0,
      status: 'Đã giao',
      surge: false,
    };
  });
  const earningsByHour = orders.reduce((entries, order) => {
    const deliveredAt = getDeliveredAt(order);
    const hour = `${new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(deliveredAt)}:00`;
    const existing = entries.get(hour) || 0;
    entries.set(hour, existing + Number(order.shippingFee || 0));
    return entries;
  }, new Map());
  const hourlyEarnings = [...earningsByHour]
    .map(([hour, base]) => ({ hour, base, bonus: 0, surge: false }))
    .sort((left, right) => left.hour.localeCompare(right.hour));
  const reviewEntries = reviews.map((review) => ({
    id: review._id.toString(),
    quote: review.shipperComment || '',
    customer: review.customer?.fullName || 'Khách hàng',
    stars: review.shipperRating,
  }));
  const periodRating = ratingSummary[0]?.average || 0;
  const periodRatingCount = ratingSummary[0]?.count || 0;
  periodData.totalEarnings = (periodData.baseFare || 0) + (periodData.bonus || 0);
  periodData.weeklyEarnings = dashboard.isDemo
    ? 0
    : (dashboard.periods.week?.baseFare || 0) + (dashboard.periods.week?.bonus || 0);
  periodData.earningsByHour = hourlyEarnings;
  periodData.trips = tripEntries;
  periodData.completedTrips = orders.length;
  periodData.baseFare = tripEntries.reduce((total, trip) => total + trip.baseFare, 0);
  periodData.bonus = 0;
  periodData.totalEarnings = periodData.baseFare;
  periodData.reviews = reviewEntries;
  periodData.rating = Math.round(periodRating * 100) / 100;
  periodData.ratingCount = periodRatingCount;
  // Nguồn số dư duy nhất của shipper là DriverDashboard.walletBalance ở cấp gốc (backfill một lần từ dữ liệu cũ nếu chưa có)
  delete periodData.walletBalance;
  if (dashboard.walletBalance == null || (dashboard.isDemo && dashboard.walletBalance !== 0)) {
    dashboard.walletBalance = dashboard.isDemo
      ? 0
      : Number(dashboard.periods?.today?.walletBalance || 0);
    await DriverDashboard.updateOne(
      { userId, ...(dashboard.isDemo ? {} : { walletBalance: null }) },
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
      rating: periodData.rating,
      ratingCount: periodRatingCount,
    }),
    payoutBank: payoutBankLabel(defaultAccount),
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
    payoutBank: payoutBankLabel(await getUserDefaultAccount(userId)),
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
