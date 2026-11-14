import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import DriverDashboard from '../models/DriverDashboard.js';
import ShipperWithdrawal from '../models/ShipperWithdrawal.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { sendRealtimeNotification } from '../socket.js';
import ApiError from '../utils/ApiError.js';
import { addDays, startOfVietnamDay, vietnamDateString } from '../utils/date.js';
import { toPage } from '../utils/pagination.js';
import { SHIPPER_WITHDRAWAL_LIMITS } from '../utils/shipperWallet.js';
import driverDashboardService from './driverDashboardService.js';
import { getUserDefaultAccount } from './payoutAccountService.js';

// A rejected request gave its money back: it no longer uses the daily limit
const getDailyWithdrawals = async (shipperId, start, end, session = null) => {
  const aggregation = ShipperWithdrawal.aggregate([
    {
      $match: {
        shipper: new mongoose.Types.ObjectId(shipperId),
        createdAt: { $gte: start, $lt: end },
        status: { $ne: 'rejected' },
      },
    },
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

const WITHDRAWAL_LINK = '/shipper/wallet';
const formatMoney = (amount) => `${amount.toLocaleString('vi-VN')}đ`;

/** The shipper's own withdrawal requests, newest first (wallet tab of the shipper portal) */
export const listMyWithdrawals = async (shipperId, { page, limit }) => {
  const filter = { shipper: shipperId };
  const [items, total] = await Promise.all([
    ShipperWithdrawal.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-processedBy')
      .lean(),
    ShipperWithdrawal.countDocuments(filter),
  ]);
  return toPage(items, { page, limit }, total);
};

/**
 * Admin: shipper withdrawal requests, newest first, with the shipper account.
 * Same shape as the customer list (listWithdrawalsForAdmin) so one admin page shows both.
 */
export const listShipperWithdrawalsForAdmin = async ({ status, page, limit }) => {
  const filter = status && status !== 'all' ? { status } : {};
  const [withdrawals, total] = await Promise.all([
    ShipperWithdrawal.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('shipper', 'fullName email phone avatar')
      .populate('processedBy', 'fullName')
      .lean(),
    ShipperWithdrawal.countDocuments(filter),
  ]);
  return { withdrawals, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
};

/**
 * Move a request out of "requested" in one atomic step: of two admins processing it at once only the first one
 * gets the document, the other one receives 409.
 */
const claimRequestedWithdrawal = async (withdrawalId, fields, session = null) => {
  const withdrawal = await ShipperWithdrawal.findOneAndUpdate(
    { _id: withdrawalId, status: 'requested' },
    { $set: fields },
    { returnDocument: 'after', runValidators: true, session },
  );
  if (withdrawal) return withdrawal;
  const exists = await ShipperWithdrawal.exists({ _id: withdrawalId }).session(session);
  if (!exists) {
    throw new ApiError(404, 'Không tìm thấy yêu cầu rút tiền');
  }
  throw new ApiError(409, 'Yêu cầu rút tiền này đã được xử lý trước đó. Vui lòng tải lại danh sách.');
};

/** Admin: the money was transferred to the shipper's bank account */
export const approveShipperWithdrawal = async (adminId, withdrawalId, { reference, note }) => {
  const withdrawal = await claimRequestedWithdrawal(withdrawalId, {
    status: 'completed',
    reference: reference.trim(),
    note: (note || '').trim(),
    processedAt: new Date(),
    processedBy: adminId,
  });
  sendRealtimeNotification(withdrawal.shipper, {
    title: 'Rút tiền thành công 💸',
    message: `Yêu cầu ${withdrawal.transactionCode} (${formatMoney(withdrawal.amount)}) đã được chuyển về ${withdrawal.bankAccount.bankName} (Mã GD: ${reference.trim()}).`,
    type: 'wallet',
    link: WITHDRAWAL_LINK,
  }).catch(() => {});
  return withdrawal;
};

/** Admin: the request is refused and its amount goes back to the earnings wallet, in the same transaction */
export const rejectShipperWithdrawal = async (adminId, withdrawalId, { reason }) => {
  const session = await mongoose.startSession();
  let withdrawal;
  try {
    await session.withTransaction(async () => {
      withdrawal = await claimRequestedWithdrawal(
        withdrawalId,
        { status: 'rejected', rejectionReason: reason.trim(), processedAt: new Date(), processedBy: adminId },
        session,
      );
      const refunded = await DriverDashboard.updateOne(
        { userId: withdrawal.shipper },
        { $inc: { walletBalance: withdrawal.amount } },
        { session },
      );
      if (!refunded.matchedCount) {
        throw new ApiError(404, 'Không tìm thấy ví của shipper');
      }
    });
  } finally {
    await session.endSession();
  }
  sendRealtimeNotification(withdrawal.shipper, {
    title: 'Yêu cầu rút tiền bị từ chối ⚠️',
    message: `Yêu cầu ${withdrawal.transactionCode} (${formatMoney(withdrawal.amount)}) bị từ chối: "${reason.trim()}". Số tiền đã được hoàn lại vào ví tài xế.`,
    type: 'wallet',
    link: WITHDRAWAL_LINK,
  }).catch(() => {});
  return withdrawal;
};

/**
 * Fine of a complaint / delivery issue taken from the shipper wallet (DriverDashboard.walletBalance, the only
 * balance of a shipper): at most the current balance, which never goes below 0. Run inside the caller's
 * transaction. The deduction is also written to the wallet ledger for the audit trail.
 * @returns {Promise<{ collected: number }>}
 */
export const deductShipperFine = async ({ shipperId, amount, orderId, description, session }) => {
  const dashboard = await DriverDashboard.findOne({ userId: shipperId }).select('walletBalance').session(session).lean();
  const collected = Math.min(amount, Math.max(0, dashboard?.walletBalance || 0));
  if (collected <= 0) return { collected: 0 };

  const updated = await DriverDashboard.findOneAndUpdate(
    { userId: shipperId, walletBalance: { $gte: collected } },
    { $inc: { walletBalance: -collected } },
    { returnDocument: 'after', session },
  ).lean();
  if (!updated) {
    throw new ApiError(409, 'Số dư ví của shipper vừa thay đổi, vui lòng thử lại');
  }
  await WalletTransaction.create(
    [
      {
        user: shipperId,
        type: 'penalty',
        amount: -collected,
        balanceAfter: updated.walletBalance,
        order: orderId,
        status: 'completed',
        description,
      },
    ],
    { session },
  );
  return { collected };
};
