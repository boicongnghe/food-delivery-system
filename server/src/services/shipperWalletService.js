import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import DriverDashboard from '../models/DriverDashboard.js';
import ShipperWithdrawal from '../models/ShipperWithdrawal.js';
import ApiError from '../utils/ApiError.js';
import { addDays, startOfVietnamDay, vietnamDateString } from '../utils/date.js';
import { SHIPPER_WITHDRAWAL_LIMITS } from '../utils/shipperWallet.js';
import driverDashboardService from './driverDashboardService.js';
import { getUserDefaultAccount } from './payoutAccountService.js';

const getDailyWithdrawals = async (shipperId, start, end, session = null) => {
  const aggregation = ShipperWithdrawal.aggregate([
    { $match: { shipper: new mongoose.Types.ObjectId(shipperId), createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: null, amount: { $sum: '$amount' } } },
  ]);
  if (session) aggregation.session(session);
  const [result] = await aggregation;
  return result?.amount || 0;
};

export const getWithdrawalLimits = async (shipperId, day = vietnamDateString()) => {
  const dailyUsed = await getDailyWithdrawals(
    shipperId,
    startOfVietnamDay(day),
    startOfVietnamDay(addDays(day, 1)),
  );
  return {
    minimum: SHIPPER_WITHDRAWAL_LIMITS.minimum,
    perWithdrawal: SHIPPER_WITHDRAWAL_LIMITS.perWithdrawal,
    daily: SHIPPER_WITHDRAWAL_LIMITS.daily,
    dailyUsed,
    dailyRemaining: Math.max(0, SHIPPER_WITHDRAWAL_LIMITS.daily - dailyUsed),
  };
};

export const requestWithdrawal = async (shipperId, amount) => {
  if (amount < SHIPPER_WITHDRAWAL_LIMITS.minimum) {
    throw new ApiError(400, `Số tiền rút tối thiểu là ${SHIPPER_WITHDRAWAL_LIMITS.minimum.toLocaleString('vi-VN')}đ`);
  }
  if (amount > SHIPPER_WITHDRAWAL_LIMITS.perWithdrawal) {
    throw new ApiError(400, `Mỗi lần rút tối đa ${SHIPPER_WITHDRAWAL_LIMITS.perWithdrawal.toLocaleString('vi-VN')}đ`);
  }

  // Withdrawals go to the default bank account saved in the wallet
  const bankAccount = await getUserDefaultAccount(shipperId);
  if (!bankAccount) {
    throw new ApiError(400, 'Hãy thêm tài khoản ngân hàng nhận tiền trong ví trước khi rút');
  }

  await driverDashboardService.getDashboard(shipperId, 'today');
  const day = vietnamDateString();
  const start = startOfVietnamDay(day);
  const end = startOfVietnamDay(addDays(day, 1));
  const session = await mongoose.startSession();
  const transactionCode = `WDR-${day.replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
  let withdrawal;

  try {
    await session.withTransaction(async () => {
      const dailyUsed = await getDailyWithdrawals(shipperId, start, end, session);
      if (dailyUsed + amount > SHIPPER_WITHDRAWAL_LIMITS.daily) {
        const remaining = Math.max(0, SHIPPER_WITHDRAWAL_LIMITS.daily - dailyUsed);
        throw new ApiError(400, `Hạn mức rút hôm nay còn ${remaining.toLocaleString('vi-VN')}đ`);
      }

      const updatedWallet = await DriverDashboard.updateOne(
        { userId: shipperId, walletBalance: { $gte: amount } },
        { $inc: { walletBalance: -amount } },
        { session },
      );
      if (!updatedWallet.modifiedCount) {
        throw new ApiError(400, 'Số dư ví không đủ để thực hiện yêu cầu rút tiền');
      }

      [withdrawal] = await ShipperWithdrawal.create(
        [{ shipper: shipperId, amount, transactionCode, status: 'requested', bankAccount }],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return {
    withdrawal: withdrawal.toObject(),
    walletBalance: (await DriverDashboard.findOne({ userId: shipperId }).select('walletBalance').lean()).walletBalance,
  };
};
