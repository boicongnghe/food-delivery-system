import { randomInt } from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import WalletDeposit from '../models/WalletDeposit.js';
import WalletTransaction from '../models/WalletTransaction.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Restaurant from '../models/Restaurant.js';
import RestaurantWallet from '../models/RestaurantWallet.js';
import RestaurantWithdrawal, {
  MAX_WITHDRAWALS_PER_WEEK,
  MIN_WITHDRAWAL_AMOUNT,
} from '../models/RestaurantWithdrawal.js';
import ApiError from '../utils/ApiError.js';
import { addDays, mondayOf, vietnamDateString } from '../utils/date.js';
import { toPage } from '../utils/pagination.js';
import { sendRealtimeNotification, emitWalletUpdate } from '../socket.js';
import { getNextSequence } from './counterService.js';
import { createTransfer, getPayoutMode } from './payoutGateway.js';
import { getWalletEarnings, toPayoutAccountView } from './restaurantReportService.js';
import {
  MAX_PAYOUT_ACCOUNTS,
  accountFields,
  findAccount,
  getUserDefaultAccount,
  hasPayoutAccount,
  listUserPayoutAccounts,
  markDefault,
  maskAccountNumber,
  notifyDefaultChange,
  pullAccount,
  pushAccount,
  saveAccountsDoc,
  toAccountsView,
} from './payoutAccountService.js';

/* ==========================================================================
   CUSTOMER VIRTUAL WALLET (Hoàn tiền đơn hàng & Rút tiền ví ảo)
   ========================================================================== */

/**
 * Realtime balance + bell notification after a refund was credited (and committed).
 * `message` replaces the default text (cancelled order), e.g. for a complaint refund.
 */
export const notifyWalletRefund = ({ userId, orderId, orderCode, amount, balance, message }) => {
  emitWalletUpdate(userId, balance);
  sendRealtimeNotification(userId, {
    title: 'Đã hoàn tiền vào ví ảo 💰',
    message:
      message ||
      `Đơn #${orderCode || orderId} đã hủy. Số tiền ${amount.toLocaleString('vi-VN')}đ đã được hoàn vào ví ảo của bạn.`,
    type: 'wallet',
    link: '/wallet',
  }).catch(() => {});
};

/**
 * Tự động hoàn tiền vào ví ảo của khách hàng khi đơn hàng bị hủy.
 * With a session the caller notifies (notifyWalletRefund) once its transaction is committed.
 */
export const creditWalletRefund = async ({
  userId,
  orderId,
  orderCode,
  amount,
  description,
  externalRef,
  session = null,
}) => {
  if (!userId || !amount || amount <= 0) return null;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { returnDocument: 'after', runValidators: true, session },
  );

  if (!updatedUser) return null;

  const [transaction] = await WalletTransaction.create(
    [
      {
        user: userId,
        type: 'refund',
        amount,
        balanceAfter: updatedUser.walletBalance,
        order: orderId,
        status: 'completed',
        description: description || `Hoàn tiền đơn hàng #${orderCode || orderId}`,
        externalRef,
      },
    ],
    { session },
  );

  if (!session) {
    notifyWalletRefund({ userId, orderId, orderCode, amount, balance: updatedUser.walletBalance });
  }

  return { updatedUser, transaction };
};

/**
 * Fine of a complaint / delivery issue taken from a customer wallet: at most the current balance (the wallet
 * never goes below 0). Run inside the caller's transaction; the caller emits the new balance once committed.
 * @returns {Promise<{ collected: number, balance: number | null }>}
 */
export const deductCustomerFine = async ({ userId, amount, orderId, description, session }) => {
  const user = await User.findById(userId).select('walletBalance').session(session).lean();
  const collected = Math.min(amount, Math.max(0, user?.walletBalance || 0));
  if (collected <= 0) return { collected: 0, balance: null };

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: collected } },
    { $inc: { walletBalance: -collected } },
    { returnDocument: 'after', runValidators: true, session },
  );
  if (!updatedUser) {
    throw new ApiError(409, 'Số dư ví của khách vừa thay đổi, vui lòng thử lại');
  }
  await WalletTransaction.create(
    [
      {
        user: userId,
        type: 'penalty',
        amount: -collected,
        balanceAfter: updatedUser.walletBalance,
        order: orderId,
        status: 'completed',
        description,
      },
    ],
    { session },
  );
  return { collected, balance: updatedUser.walletBalance };
};

const ensureCustomerWalletUser = async (userId, select = 'role walletBalance fullName email phone') => {
  const user = await User.findById(userId).select(select).lean();
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy thông tin người dùng');
  }
  if (user.role !== 'customer') {
    throw new ApiError(403, 'Ví ảo chỉ dành cho tài khoản khách hàng');
  }
  return user;
};

/**
 * Lấy thông tin ví & lịch sử giao dịch của khách hàng
 */
export const getMyWallet = async (userId) => {
  const user = await ensureCustomerWalletUser(userId, 'role walletBalance fullName email phone');

  const [transactions, withdrawals] = await Promise.all([
    WalletTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('order', 'orderNumber orderCode')
      .lean(),
    WithdrawalRequest.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const { accounts, maxAccounts } = await listUserPayoutAccounts(userId);
  return {
    balance: user.walletBalance || 0,
    transactions,
    withdrawals,
    minWithdrawal: CUSTOMER_MIN_WITHDRAWAL,
    payoutAccounts: accounts, // default first: withdrawals go to it
    maxPayoutAccounts: maxAccounts,
  };
};

const CUSTOMER_MIN_WITHDRAWAL = 10000;

/**
 * Khách hàng tạo yêu cầu rút tiền từ ví ảo về tài khoản ngân hàng MẶC ĐỊNH đã lưu trong ví
 * (bản sao tài khoản được lưu vào yêu cầu: đổi mặc định sau đó không làm sai lịch sử)
 */
export const requestCustomerWithdrawal = async (userId, { amount }) => {
  await ensureCustomerWalletUser(userId, 'role');

  const withdrawAmount = Number(amount);
  if (!withdrawAmount || withdrawAmount < CUSTOMER_MIN_WITHDRAWAL) {
    throw new ApiError(400, 'Số tiền rút tối thiểu là 10.000đ');
  }

  const bankAccount = await getUserDefaultAccount(userId);
  if (!bankAccount) {
    throw new ApiError(400, 'Hãy thêm tài khoản ngân hàng nhận tiền trong ví trước khi rút');
  }
  const { bankName, accountNumber, accountHolder } = bankAccount;

  // Trừ tiền ngay lập tức khi tạo yêu cầu
  const user = await User.findOneAndUpdate(
    { _id: userId, role: 'customer', walletBalance: { $gte: withdrawAmount } },
    { $inc: { walletBalance: -withdrawAmount } },
    { returnDocument: 'after', runValidators: true },
  );

  if (!user) {
    throw new ApiError(400, 'Số dư ví ảo không đủ để thực hiện yêu cầu rút tiền');
  }

  const withdrawal = await WithdrawalRequest.create({
    user: userId,
    amount: withdrawAmount,
    bankInfo: { bankName, accountNumber, accountHolder },
    status: 'pending',
  });

  await WalletTransaction.create({
    user: userId,
    type: 'withdraw',
    amount: -withdrawAmount,
    balanceAfter: user.walletBalance,
    withdrawalRequest: withdrawal._id,
    status: 'pending',
    description: `Yêu cầu rút tiền về ${bankName} (${maskAccountNumber(accountNumber)})`,
  });

  emitWalletUpdate(userId, user.walletBalance);

  return withdrawal;
};

// Alias for customer withdrawal
export const requestWithdrawal = requestCustomerWithdrawal;

/**
 * Admin: Lấy danh sách yêu cầu rút tiền
 */
export const listWithdrawalsForAdmin = async ({ status, page = 1, limit = 20 }) => {
  const filter = {};
  if (status && status !== 'all') {
    filter.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [withdrawals, total] = await Promise.all([
    WithdrawalRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'fullName email phone avatar')
      .populate('processedBy', 'fullName')
      .lean(),
    WithdrawalRequest.countDocuments(filter),
  ]);

  return {
    withdrawals,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Move a withdrawal request out of "pending" in one atomic step: of two concurrent approve / reject
 * calls (two admins, two tabs) only the first one gets the document, the other one receives 409.
 */
const claimPendingWithdrawal = async (withdrawalId, fields, session) => {
  const withdrawal = await WithdrawalRequest.findOneAndUpdate(
    { _id: withdrawalId, status: 'pending' },
    { $set: fields },
    { returnDocument: 'after', runValidators: true, session },
  );
  if (withdrawal) return withdrawal;

  const exists = await WithdrawalRequest.exists({ _id: withdrawalId }).session(session);
  if (!exists) {
    throw new ApiError(404, 'Không tìm thấy yêu cầu rút tiền');
  }
  throw new ApiError(409, 'Yêu cầu rút tiền này đã được xử lý trước đó. Vui lòng tải lại danh sách.');
};

/**
 * Admin: Duyệt yêu cầu rút tiền (xác nhận đã chuyển khoản)
 */
export const approveWithdrawal = async (adminId, withdrawalId, { reference, note }) => {
  if (!reference?.trim()) {
    throw new ApiError(400, 'Vui lòng cung cấp mã giao dịch chuyển tiền (reference/FT)');
  }

  const session = await mongoose.startSession();
  let withdrawal;
  try {
    await session.withTransaction(async () => {
      withdrawal = await claimPendingWithdrawal(
        withdrawalId,
        {
          status: 'completed',
          reference: reference.trim(),
          note: (note || '').trim(),
          processedAt: new Date(),
          processedBy: adminId,
        },
        session,
      );

      // Cập nhật trạng thái giao dịch ví tương ứng
      await WalletTransaction.updateOne(
        { withdrawalRequest: withdrawalId },
        { $set: { status: 'completed' } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  // Thông báo tới khách hàng
  sendRealtimeNotification(withdrawal.user, {
    title: 'Rút tiền thành công 💸',
    message: `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')}đ về tài khoản ${withdrawal.bankInfo.bankName} đã được chuyển khoản (Mã GD: ${reference.trim()}).`,
    type: 'wallet',
    link: '/wallet',
  }).catch(() => {});

  return withdrawal;
};

/**
 * Admin: Từ chối yêu cầu rút tiền (hoàn lại tiền vào ví ảo của khách)
 */
export const rejectWithdrawal = async (adminId, withdrawalId, { reason }) => {
  if (!reason?.trim()) {
    throw new ApiError(400, 'Vui lòng nhập lý do từ chối yêu cầu rút tiền');
  }

  const session = await mongoose.startSession();
  let withdrawal;
  let updatedUser;
  try {
    await session.withTransaction(async () => {
      withdrawal = await claimPendingWithdrawal(
        withdrawalId,
        {
          status: 'rejected',
          rejectionReason: reason.trim(),
          processedAt: new Date(),
          processedBy: adminId,
        },
        session,
      );

      // Hoàn tiền lại vào ví ảo của khách (cùng transaction: không bao giờ hoàn mà yêu cầu vẫn "pending")
      updatedUser = await User.findByIdAndUpdate(
        withdrawal.user,
        { $inc: { walletBalance: withdrawal.amount } },
        { returnDocument: 'after', runValidators: true, session },
      );
      if (!updatedUser) {
        throw new ApiError(404, 'Không tìm thấy tài khoản của yêu cầu rút tiền');
      }

      // Cập nhật giao dịch cũ và tạo giao dịch hoàn tiền rút
      await WalletTransaction.updateOne(
        { withdrawalRequest: withdrawalId },
        { $set: { status: 'rejected' } },
        { session },
      );

      await WalletTransaction.create(
        [
          {
            user: withdrawal.user,
            type: 'withdraw_rejected',
            amount: withdrawal.amount,
            balanceAfter: updatedUser.walletBalance,
            withdrawalRequest: withdrawalId,
            status: 'completed',
            description: `Hoàn lại tiền rút bị từ chối: ${reason.trim()}`,
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  // Thông báo tới khách hàng
  emitWalletUpdate(withdrawal.user, updatedUser.walletBalance);
  sendRealtimeNotification(withdrawal.user, {
    title: 'Yêu cầu rút tiền bị từ chối ⚠️',
    message: `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')}đ đã bị từ chối: "${reason.trim()}". Số tiền đã được hoàn lại vào ví ảo của bạn.`,
    type: 'wallet',
    link: '/wallet',
  }).catch(() => {});

  return withdrawal;
};

/* ----- Nạp tiền vào ví ảo: chỉ được cộng tiền từ webhook ngân hàng đã xác thực ----- */

const DEPOSIT_CODE_PREFIX = 'NAPVI';
// No 0/O, 1/I: the customer may type the code by hand in the banking app
const DEPOSIT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEPOSIT_CODE_LENGTH = 8;
// Matched on the content with spaces and symbols removed (banks often drop or change them)
const DEPOSIT_CODE_PATTERN = new RegExp(`${DEPOSIT_CODE_PREFIX}([A-Z0-9]{${DEPOSIT_CODE_LENGTH}})`);
const DEPOSIT_CODE_ATTEMPTS = 5;

const randomDepositSuffix = () =>
  Array.from({ length: DEPOSIT_CODE_LENGTH }, () => DEPOSIT_CODE_ALPHABET[randomInt(DEPOSIT_CODE_ALPHABET.length)]).join('');

/** Deposit code (e.g. NAPVI7KX2P9QA) found in a transfer content, or null */
export const findDepositCode = (text) => {
  const normalized = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = normalized.match(DEPOSIT_CODE_PATTERN);
  return match ? `${DEPOSIT_CODE_PREFIX}${match[1]}` : null;
};

/**
 * Tạo thông tin VietQR nạp tiền vào ví ảo của khách hàng.
 * The code is stored so the webhook credits the wallet of this user only.
 */
export const createDepositRequest = async (userId, { amount }) => {
  const user = await ensureCustomerWalletUser(userId, 'role fullName phone email');

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount < 10000) {
    throw new ApiError(400, 'Số tiền nạp tối thiểu là 10.000đ');
  }
  if (numAmount > 50000000) {
    throw new ApiError(400, 'Số tiền nạp tối đa mỗi lần là 50.000.000đ');
  }

  let deposit = null;
  let suffix = '';
  for (let attempt = 0; attempt < DEPOSIT_CODE_ATTEMPTS && !deposit; attempt += 1) {
    suffix = randomDepositSuffix();
    try {
      deposit = await WalletDeposit.create({ user: user._id, code: `${DEPOSIT_CODE_PREFIX}${suffix}`, amount: numAmount });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  if (!deposit) {
    throw new ApiError(500, 'Không thể tạo mã nạp tiền, vui lòng thử lại');
  }
  const bankId = (process.env.BANK_ID || 'TPB').trim().toUpperCase();
  const accountNo = (process.env.BANK_ACCOUNT_NO || '0393863658').trim();
  const accountName = (process.env.BANK_ACCOUNT_NAME || 'DO MANH DUONG').trim().toUpperCase();

  const transferContent = `${DEPOSIT_CODE_PREFIX} ${suffix}`;
  const encodedName = encodeURIComponent(accountName);
  const encodedInfo = encodeURIComponent(transferContent);
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${numAmount}&addInfo=${encodedInfo}&accountName=${encodedName}`;

  return {
    depositId: deposit._id,
    depositCode: deposit.code,
    amount: numAmount,
    bankId,
    accountNo,
    accountName,
    transferContent,
    qrUrl,
  };
};

/** Trạng thái một yêu cầu nạp tiền của chính người dùng (màn nạp ví hỏi định kỳ chờ webhook) */
export const getDepositStatus = async (userId, depositId) => {
  await ensureCustomerWalletUser(userId, 'role');
  const deposit = await WalletDeposit.findOne({ _id: depositId, user: userId })
    .select('code amount status creditedAmount completedAt createdAt')
    .lean();
  if (!deposit) {
    throw new ApiError(404, 'Không tìm thấy yêu cầu nạp tiền');
  }
  return deposit;
};

/** Find a deposit request by code (simulation checks that the caller owns it) */
export const findDepositByCode = (code) => WalletDeposit.findOne({ code }).lean();

/**
 * Credit a wallet from a verified bank transfer that carries a deposit code.
 * externalRef (the bank transaction reference) is unique: a webhook sent twice credits once.
 */
export const creditDepositFromBank = async ({ code, amount, externalRef, source = 'SePay' }) => {
  const deposit = await WalletDeposit.findOne({ code }).lean();
  if (!deposit) {
    return { success: false, message: `Không tìm thấy yêu cầu nạp tiền có mã ${code}` };
  }

  const targetUser = await User.findById(deposit.user).select('role').lean();
  if (!targetUser) {
    throw new ApiError(404, 'Không tìm thấy người dùng của yêu cầu nạp tiền');
  }
  if (targetUser.role !== 'customer') {
    return { success: false, message: 'Ví ảo chỉ hỗ trợ nạp tiền cho tài khoản khách hàng (customer)' };
  }

  const session = await mongoose.startSession();
  let updatedUser;
  try {
    await session.withTransaction(async () => {
      updatedUser = await User.findOneAndUpdate(
        { _id: deposit.user, role: 'customer' },
        { $inc: { walletBalance: amount } },
        { returnDocument: 'after', runValidators: true, session },
      );
      if (!updatedUser) {
        throw new ApiError(403, 'Ví ảo chỉ hỗ trợ nạp tiền cho tài khoản khách hàng');
      }

      await WalletTransaction.create(
        [
          {
            user: deposit.user,
            type: 'deposit',
            amount,
            balanceAfter: updatedUser.walletBalance,
            status: 'completed',
            externalRef,
            description: `Nạp tiền vào ví qua ${source} - Mã nạp: ${code} - Mã GD: ${externalRef}`,
          },
        ],
        { session },
      );

      // A second transfer with the same code is credited too (real money arrived): the amounts add up
      await WalletDeposit.updateOne(
        { _id: deposit._id },
        { $set: { status: 'completed', completedAt: new Date() }, $inc: { creditedAmount: amount } },
        { session },
      );
    });
  } catch (error) {
    // Duplicate externalRef: this bank transaction was credited before, nothing was changed
    if (error?.code === 11000) {
      return { success: true, alreadyProcessed: true, message: 'Giao dịch nạp tiền này đã được ghi nhận trước đó' };
    }
    throw error;
  } finally {
    await session.endSession();
  }

  emitWalletUpdate(deposit.user, updatedUser.walletBalance);
  sendRealtimeNotification(deposit.user, {
    title: 'Nạp tiền vào ví thành công 👛',
    message: `Bạn vừa nạp thành công ${amount.toLocaleString('vi-VN')}đ vào Ví ảo. Số dư hiện tại: ${updatedUser.walletBalance.toLocaleString('vi-VN')}đ.`,
    type: 'wallet',
    link: '/wallet',
  }).catch(() => {});

  return {
    success: true,
    type: 'deposit',
    message: `Đã nạp thành công ${amount.toLocaleString('vi-VN')}đ vào ví người dùng`,
    data: {
      userId: deposit.user,
      depositId: deposit._id,
      amount,
      newBalance: updatedUser.walletBalance,
      transactionCode: externalRef,
    },
  };
};

/* ==========================================================================
   RESTAURANT WALLET (Ví nhà hàng & Rút tiền doanh thu)
   ========================================================================== */

/**
 * Restaurant wallet (docs/restaurant-wallet.md).
 * available = net revenue credited after the end-of-day reconciliation - withdrawals processing or succeeded.
 * Withdraw: at least MIN_WITHDRAWAL_AMOUNT, at most the available balance, MAX_WITHDRAWALS_PER_WEEK per
 * Vietnam week (failed transfers do not count), to the bank account of the restaurant profile.
 */

const WALLET_LINK = '/restaurant/revenue?tab=wallet';
const formatMoney = (amount) => `${amount.toLocaleString('vi-VN')}đ`;
const formatDay = (day) => day.split('-').reverse().join('/');
const fieldError = (status, message, field = 'amount') => new ApiError(status, message, [{ field, message }]);

const weekOf = (today) => {
  const from = mondayOf(today);
  return { from, to: addDays(from, 6), resetsOn: addDays(from, 7) };
};

// Money the owner can withdraw: credited earnings - withdrawals (processing / succeeded) - fines
const availableOf = (earnings, wallet) =>
  Math.max(0, earnings.credited - wallet.withdrawnTotal - (wallet.penaltyTotal || 0));

const usedInWeek = (wallet, week) => (wallet.weekStart === week.from ? wallet.weekCount : 0);


// Inside a transaction, pass its session: a write outside it would conflict with the transaction's own update
const getOrCreateWallet = async (restaurantId, session = null) => {
  try {
    return await RestaurantWallet.findOneAndUpdate(
      { restaurant: restaurantId },
      { $setOnInsert: { restaurant: restaurantId } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, session },
    ).lean();
  } catch (error) {
    // Two first requests at once: the unique index lets one insert, the other reads it
    if (error.code === 11000) return RestaurantWallet.findOne({ restaurant: restaurantId }).session(session).lean();
    throw error;
  }
};

// Why the owner cannot withdraw now ('' = allowed)
const getBlockedReason = (restaurant, available, used, week) => {
  if (restaurant.status === 'suspended') return 'Quán đang bị tạm ngưng hoạt động nên ví tạm khóa. Vui lòng liên hệ quản trị viên.';
  if (!hasPayoutAccount(restaurant.payoutAccount)) return 'Chưa có tài khoản nhận tiền. Hãy khai báo ở mục "Tài khoản nhận tiền" của ví.';
  if (used >= MAX_WITHDRAWALS_PER_WEEK) {
    return `Đã rút đủ ${MAX_WITHDRAWALS_PER_WEEK} lần trong tuần. Lượt rút làm mới vào Thứ Hai ${formatDay(week.resetsOn)}.`;
  }
  if (available < MIN_WITHDRAWAL_AMOUNT) return `Số dư khả dụng chưa đạt mức rút tối thiểu ${formatMoney(MIN_WITHDRAWAL_AMOUNT)}.`;
  return '';
};


/**
 * Account list of a restaurant. A restaurant from before the list existed has its single account moved into
 * it once, as the default entry (conditional on the list still being empty, so it happens only once).
 */
const ensureAccountList = async (restaurant) => {
  if (restaurant.payoutAccounts?.length) return restaurant.payoutAccounts;
  if (!hasPayoutAccount(restaurant.payoutAccount)) return [];
  await Restaurant.updateOne(
    { _id: restaurant._id, payoutAccounts: { $size: 0 } },
    { $push: { payoutAccounts: { ...accountFields(restaurant.payoutAccount), isDefault: true } } },
    { timestamps: false },
  );
  const fresh = await Restaurant.findById(restaurant._id).select('payoutAccounts').lean();
  return fresh?.payoutAccounts || [];
};

const toWithdrawalView = (withdrawal) => ({
  _id: withdrawal._id,
  code: withdrawal.code,
  amount: withdrawal.amount,
  status: withdrawal.status,
  bankAccount: {
    bankName: withdrawal.bankAccount?.bankName || '',
    accountNumber: maskAccountNumber(withdrawal.bankAccount?.accountNumber),
    accountHolder: withdrawal.bankAccount?.accountHolder || '',
  },
  provider: withdrawal.provider,
  providerRef: withdrawal.providerRef,
  failureReason: withdrawal.failureReason,
  createdAt: withdrawal.createdAt,
  completedAt: withdrawal.completedAt,
});

const sumByStatus = async (restaurantId) => {
  const groups = await RestaurantWithdrawal.aggregate([
    { $match: { restaurant: restaurantId, status: { $in: ['processing', 'succeeded'] } } },
    { $group: { _id: '$status', amount: { $sum: '$amount' } } },
  ]);
  const sums = { processing: 0, succeeded: 0 };
  for (const group of groups) sums[group._id] = group.amount;
  return sums;
};

export const getWallet = async (restaurant) => {
  const today = vietnamDateString();
  const week = weekOf(today);
  const [wallet, earnings, sums] = await Promise.all([
    getOrCreateWallet(restaurant._id),
    getWalletEarnings(restaurant._id, today),
    sumByStatus(restaurant._id),
  ]);
  const available = availableOf(earnings, wallet);
  const used = usedInWeek(wallet, week);
  const blockedReason = getBlockedReason(restaurant, available, used, week);

  return {
    balance: {
      available,
      pendingSettlement: earnings.pending, // today's delivered orders, credited after the end-of-day reconciliation
      processing: sums.processing,
      withdrawn: sums.succeeded,
      penalties: wallet.penaltyTotal || 0, // fines of complaints / delivery issues
      totalEarned: earnings.credited + earnings.pending,
    },
    limits: {
      minAmount: MIN_WITHDRAWAL_AMOUNT,
      maxPerWeek: MAX_WITHDRAWALS_PER_WEEK,
      usedThisWeek: used,
      remainingThisWeek: Math.max(0, MAX_WITHDRAWALS_PER_WEEK - used),
      weekFrom: week.from,
      weekTo: week.to,
      resetsOn: week.resetsOn,
    },
    payoutAccount: toPayoutAccountView(restaurant.payoutAccount), // the default one: withdrawals go there
    payoutAccounts: toPayoutAccountsView({ payoutAccounts: await ensureAccountList(restaurant) }),
    maxPayoutAccounts: MAX_PAYOUT_ACCOUNTS,
    mode: getPayoutMode(),
    canWithdraw: !blockedReason,
    blockedReason,
  };
};

/**
 * Fine of a complaint / delivery issue taken from a restaurant wallet: at most the available balance.
 * Compare-and-set on `version` like a withdrawal, so a fine and a withdrawal at the same time can never
 * spend the same money twice. Run inside the caller's transaction.
 * @returns {Promise<{ collected: number }>}
 */
export const deductRestaurantFine = async ({ restaurantId, amount, session }) => {
  const wallet = await getOrCreateWallet(restaurantId, session);
  const earnings = await getWalletEarnings(restaurantId, vietnamDateString());
  const collected = Math.min(amount, availableOf(earnings, wallet));
  if (collected <= 0) return { collected: 0 };

  const updated = await RestaurantWallet.updateOne(
    { _id: wallet._id, version: wallet.version },
    { $inc: { penaltyTotal: collected, version: 1 } },
    { session },
  );
  if (!updated.modifiedCount) {
    throw new ApiError(409, 'Ví của nhà hàng vừa có giao dịch khác, vui lòng thử lại');
  }
  return { collected };
};

// ---------- Restaurant bank accounts (rules shared with customers / shippers: payoutAccountService)

export const toPayoutAccountsView = (restaurant) => toAccountsView(restaurant.payoutAccounts);

/**
 * The restaurant document to change, with its account list ready (a restaurant from before the list has its
 * single account turned into the default entry). A suspended restaurant cannot change where its money goes.
 */
const loadAccountsForChange = async (restaurantId) => {
  const restaurant = await Restaurant.findById(restaurantId).select('status payoutAccount payoutAccounts payoutAccountChangedAt');
  if (!restaurant) {
    throw new ApiError(404, 'Bạn chưa có hồ sơ nhà hàng');
  }
  if (restaurant.status === 'suspended') {
    throw new ApiError(403, 'Quán đang bị tạm ngưng hoạt động nên không thể thay đổi tài khoản nhận tiền');
  }
  if (restaurant.payoutAccounts.length === 0 && hasPayoutAccount(restaurant.payoutAccount)) {
    restaurant.payoutAccounts.push({ ...accountFields(restaurant.payoutAccount), isDefault: true });
  }
  return restaurant;
};

// Keep payoutAccount (read by reports and withdrawals) equal to the default entry, then save
const saveAccounts = async (restaurant) => {
  const defaultAccount = restaurant.payoutAccounts.find((account) => account.isDefault);
  restaurant.payoutAccount = defaultAccount ? accountFields(defaultAccount) : { bankName: '', accountNumber: '', accountHolder: '' };
  restaurant.payoutAccountChangedAt = new Date();
  await saveAccountsDoc(restaurant);
  return defaultAccount;
};

/** Add a bank account (max 5). The first one, or one added with makeDefault, becomes the default. */
export const addPayoutAccount = async (restaurantId, ownerId, { makeDefault, ...fields }) => {
  const restaurant = await loadAccountsForChange(restaurantId);
  const { account, becameDefault } = pushAccount(restaurant, fields, makeDefault);
  await saveAccounts(restaurant);
  await notifyDefaultChange(
    ownerId,
    account,
    becameDefault ? 'Tài khoản nhận tiền mặc định đã thay đổi' : 'Đã thêm tài khoản ngân hàng',
    WALLET_LINK,
  );
  return toPayoutAccountsView(restaurant);
};

/** Choose which account receives the withdrawals from now on (withdrawals already sent keep their own copy). */
export const setDefaultPayoutAccount = async (restaurantId, ownerId, accountId) => {
  const restaurant = await loadAccountsForChange(restaurantId);
  const account = findAccount(restaurant, accountId);
  if (!account.isDefault) {
    markDefault(restaurant, account);
    await saveAccounts(restaurant);
    await notifyDefaultChange(ownerId, account, 'Tài khoản nhận tiền mặc định đã thay đổi', WALLET_LINK);
  }
  return toPayoutAccountsView(restaurant);
};

/** Remove an account; the default one only when it is the last one. */
export const removePayoutAccount = async (restaurantId, accountId) => {
  const restaurant = await loadAccountsForChange(restaurantId);
  pullAccount(restaurant, accountId);
  await saveAccounts(restaurant);
  return toPayoutAccountsView(restaurant);
};

export const listWithdrawals = async (restaurant, { page, limit }) => {
  const filter = { restaurant: restaurant._id };
  const [items, totalItems] = await Promise.all([
    RestaurantWithdrawal.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    RestaurantWithdrawal.countDocuments(filter),
  ]);
  return toPage(items.map(toWithdrawalView), { page, limit }, totalItems);
};

/**
 * Final result of a transfer, from the gateway webhook or (demo) right after the request.
 * Conditional on "processing": a webhook delivered twice changes nothing the second time.
 * A failed transfer gives the money back to the wallet and does not use up a weekly turn.
 * @returns {Promise<{ withdrawal: object, changed: boolean }>}
 */
export const applyPayoutResult = async ({ reference, status, providerRef = '', failureReason = '' }) => {
  const updated = await RestaurantWithdrawal.findOneAndUpdate(
    { code: reference, status: 'processing' },
    {
      $set: {
        status,
        completedAt: new Date(),
        ...(providerRef && { providerRef }),
        failureReason: status === 'failed' ? failureReason || 'Ngân hàng từ chối giao dịch' : '',
      },
    },
    { returnDocument: 'after' },
  ).lean();

  if (!updated) {
    const current = await RestaurantWithdrawal.findOne({ code: reference }).lean();
    if (!current) {
      throw new ApiError(404, 'Không tìm thấy lệnh rút tiền');
    }
    return { withdrawal: toWithdrawalView(current), changed: false };
  }

  if (status === 'failed') {
    await RestaurantWallet.updateOne(
      { restaurant: updated.restaurant },
      { $inc: { withdrawnTotal: -updated.amount, version: 1 } },
    );
    // The turn is given back only while its week is still the counted one
    await RestaurantWallet.updateOne(
      { restaurant: updated.restaurant, weekStart: mondayOf(vietnamDateString(updated.createdAt)), weekCount: { $gt: 0 } },
      { $inc: { weekCount: -1, version: 1 } },
    );
  }

  await sendRealtimeNotification(updated.requestedBy, {
    title: status === 'succeeded' ? `Rút tiền thành công ${formatMoney(updated.amount)} 💸` : `Rút tiền ${updated.code} không thành công`,
    message:
      status === 'succeeded'
        ? `Lệnh ${updated.code} đã chuyển về ${updated.bankAccount.bankName} ${maskAccountNumber(updated.bankAccount.accountNumber)}.`
        : `${updated.failureReason}. Số tiền đã được hoàn lại vào ví.`,
    type: 'system',
    link: WALLET_LINK,
  });

  return { withdrawal: toWithdrawalView(updated), changed: true };
};

/**
 * Withdraw from the wallet to the restaurant's bank account.
 * 1. Same idempotencyKey again (double click, retry after a timeout): the first withdrawal is returned.
 * 2. Every limit is checked on the wallet just read, then reserved with ONE compare-and-set on its version:
 *    a concurrent request makes this one fail with 409 instead of overspending.
 * 3. The transfer is sent to the gateway; demo mode confirms it at once through applyPayoutResult.
 */
export const requestRestaurantWithdrawal = async (restaurant, ownerId, { amount, idempotencyKey }) => {
  const restaurantId = restaurant._id;
  const replay = await RestaurantWithdrawal.findOne({ restaurant: restaurantId, idempotencyKey }).lean();
  if (replay) return toWithdrawalView(replay);

  const today = vietnamDateString();
  const week = weekOf(today);
  const wallet = await getOrCreateWallet(restaurantId);
  const earnings = await getWalletEarnings(restaurantId, today);
  const available = availableOf(earnings, wallet);
  const used = usedInWeek(wallet, week);

  const blockedReason = getBlockedReason(restaurant, available, used, week);
  if (blockedReason) {
    throw new ApiError(409, blockedReason);
  }
  if (amount > available) {
    throw fieldError(400, `Số tiền rút vượt quá số dư khả dụng (${formatMoney(available)})`);
  }

  const reserved = await RestaurantWallet.findOneAndUpdate(
    { _id: wallet._id, version: wallet.version },
    { $inc: { version: 1, withdrawnTotal: amount }, $set: { weekStart: week.from, weekCount: used + 1 } },
    { returnDocument: 'after' },
  );
  if (!reserved) {
    throw new ApiError(409, 'Ví vừa có giao dịch khác, vui lòng tải lại và thử lại');
  }

  let withdrawal;
  try {
    withdrawal = await RestaurantWithdrawal.create({
      code: `RT-${String(await getNextSequence('restaurantWithdrawal')).padStart(4, '0')}`,
      restaurant: restaurantId,
      requestedBy: ownerId,
      amount,
      bankAccount: {
        bankName: restaurant.payoutAccount.bankName,
        accountNumber: restaurant.payoutAccount.accountNumber,
        accountHolder: restaurant.payoutAccount.accountHolder,
      },
      provider: getPayoutMode(),
      idempotencyKey,
    });
  } catch (error) {
    // Nothing was sent: give back the money and the weekly turn reserved above
    await RestaurantWallet.updateOne(
      { _id: wallet._id },
      { $inc: { withdrawnTotal: -amount, weekCount: -1, version: 1 } },
    );
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      return toWithdrawalView(await RestaurantWithdrawal.findOne({ restaurant: restaurantId, idempotencyKey }).lean());
    }
    throw error;
  }

  try {
    const transfer = await createTransfer({
      reference: withdrawal.code,
      amount,
      bankAccount: withdrawal.bankAccount,
    });
    await RestaurantWithdrawal.updateOne({ _id: withdrawal._id }, { $set: { providerRef: transfer.providerRef } });
    if (transfer.immediateResult) {
      await applyPayoutResult({ reference: withdrawal.code, status: transfer.immediateResult, providerRef: transfer.providerRef });
    }
  } catch (error) {
    await applyPayoutResult({
      reference: withdrawal.code,
      status: 'failed',
      failureReason: `Không gửi được lệnh chuyển tiền: ${error.message}`,
    });
  }

  return toWithdrawalView(await RestaurantWithdrawal.findById(withdrawal._id).lean());
};
