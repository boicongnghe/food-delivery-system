import User from '../models/User.js';
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
import { sendRealtimeNotification } from '../socket.js';
import { getNextSequence } from './counterService.js';
import { createTransfer, getPayoutMode } from './payoutGateway.js';
import { getWalletEarnings, toPayoutAccountView } from './restaurantReportService.js';

/* ==========================================================================
   CUSTOMER VIRTUAL WALLET (Hoàn tiền đơn hàng & Rút tiền ví ảo)
   ========================================================================== */

/**
 * Tự động hoàn tiền vào ví ảo của khách hàng khi đơn hàng bị hủy
 */
export const creditWalletRefund = async ({ userId, orderId, orderCode, amount }) => {
  if (!userId || !amount || amount <= 0) return null;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { returnDocument: 'after', runValidators: true },
  );

  if (!updatedUser) return null;

  const transaction = await WalletTransaction.create({
    user: userId,
    type: 'refund',
    amount,
    balanceAfter: updatedUser.walletBalance,
    order: orderId,
    status: 'completed',
    description: `Hoàn tiền đơn hàng #${orderCode || orderId}`,
  });

  // Bắn thông báo realtime và lưu vào Notification
  sendRealtimeNotification(userId, {
    title: 'Đã hoàn tiền vào ví ảo 💰',
    message: `Đơn #${orderCode || orderId} đã hủy. Số tiền ${amount.toLocaleString('vi-VN')}đ đã được hoàn vào ví ảo của bạn.`,
    type: 'wallet',
    link: '/wallet',
  }).catch(() => {});

  return { updatedUser, transaction };
};

/**
 * Lấy thông tin ví & lịch sử giao dịch của khách hàng
 */
export const getMyWallet = async (userId) => {
  const user = await User.findById(userId).select('walletBalance fullName email phone').lean();
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy thông tin người dùng');
  }

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

  return {
    balance: user.walletBalance || 0,
    transactions,
    withdrawals,
  };
};

/**
 * Khách hàng tạo yêu cầu rút tiền từ ví ảo về tài khoản ngân hàng
 */
export const requestCustomerWithdrawal = async (userId, { amount, bankName, accountNumber, accountHolder }) => {
  const withdrawAmount = Number(amount);
  if (!withdrawAmount || withdrawAmount < 10000) {
    throw new ApiError(400, 'Số tiền rút tối thiểu là 10.000đ');
  }

  if (!bankName?.trim() || !accountNumber?.trim() || !accountHolder?.trim()) {
    throw new ApiError(400, 'Vui lòng điền đầy đủ thông tin ngân hàng nhận tiền');
  }

  // Trừ tiền ngay lập tức khi tạo yêu cầu
  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: withdrawAmount } },
    { $inc: { walletBalance: -withdrawAmount } },
    { returnDocument: 'after', runValidators: true },
  );

  if (!user) {
    throw new ApiError(400, 'Số dư ví ảo không đủ để thực hiện yêu cầu rút tiền');
  }

  const withdrawal = await WithdrawalRequest.create({
    user: userId,
    amount: withdrawAmount,
    bankInfo: {
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim().toUpperCase(),
    },
    status: 'pending',
  });

  await WalletTransaction.create({
    user: userId,
    type: 'withdraw',
    amount: -withdrawAmount,
    balanceAfter: user.walletBalance,
    withdrawalRequest: withdrawal._id,
    status: 'pending',
    description: `Yêu cầu rút tiền về ${bankName} (${accountNumber})`,
  });

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
 * Admin: Duyệt yêu cầu rút tiền (xác nhận đã chuyển khoản)
 */
export const approveWithdrawal = async (adminId, withdrawalId, { reference, note }) => {
  if (!reference?.trim()) {
    throw new ApiError(400, 'Vui lòng cung cấp mã giao dịch chuyển tiền (reference/FT)');
  }

  const withdrawal = await WithdrawalRequest.findOne({
    _id: withdrawalId,
    status: 'pending',
  });

  if (!withdrawal) {
    throw new ApiError(404, 'Không tìm thấy yêu cầu rút tiền đang chờ xử lý');
  }

  withdrawal.status = 'completed';
  withdrawal.reference = reference.trim();
  withdrawal.note = (note || '').trim();
  withdrawal.processedAt = new Date();
  withdrawal.processedBy = adminId;
  await withdrawal.save();

  // Cập nhật trạng thái giao dịch ví tương ứng
  await WalletTransaction.findOneAndUpdate(
    { withdrawalRequest: withdrawalId },
    { status: 'completed' },
  );

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

  const withdrawal = await WithdrawalRequest.findOne({
    _id: withdrawalId,
    status: 'pending',
  });

  if (!withdrawal) {
    throw new ApiError(404, 'Không tìm thấy yêu cầu rút tiền đang chờ xử lý');
  }

  withdrawal.status = 'rejected';
  withdrawal.rejectionReason = reason.trim();
  withdrawal.processedAt = new Date();
  withdrawal.processedBy = adminId;
  await withdrawal.save();

  // Hoàn tiền lại vào ví ảo của khách
  const updatedUser = await User.findByIdAndUpdate(
    withdrawal.user,
    { $inc: { walletBalance: withdrawal.amount } },
    { returnDocument: 'after', runValidators: true },
  );

  // Cập nhật giao dịch cũ và tạo giao dịch hoàn tiền rút
  await WalletTransaction.findOneAndUpdate(
    { withdrawalRequest: withdrawalId },
    { status: 'rejected' },
  );

  await WalletTransaction.create({
    user: withdrawal.user,
    type: 'withdraw_rejected',
    amount: withdrawal.amount,
    balanceAfter: updatedUser.walletBalance,
    withdrawalRequest: withdrawalId,
    status: 'completed',
    description: `Hoàn lại tiền rút bị từ chối: ${reason.trim()}`,
  });

  // Thông báo tới khách hàng
  sendRealtimeNotification(withdrawal.user, {
    title: 'Yêu cầu rút tiền bị từ chối ⚠️',
    message: `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')}đ đã bị từ chối: "${reason.trim()}". Số tiền đã được hoàn lại vào ví ảo của bạn.`,
    type: 'wallet',
    link: '/wallet',
  }).catch(() => {});

  return withdrawal;
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

const usedInWeek = (wallet, week) => (wallet.weekStart === week.from ? wallet.weekCount : 0);

const hasPayoutAccount = (account = {}) => Boolean(account.bankName && account.accountNumber && account.accountHolder);

const getOrCreateWallet = async (restaurantId) => {
  try {
    return await RestaurantWallet.findOneAndUpdate(
      { restaurant: restaurantId },
      { $setOnInsert: { restaurant: restaurantId } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
  } catch (error) {
    // Two first requests at once: the unique index lets one insert, the other reads it
    if (error.code === 11000) return RestaurantWallet.findOne({ restaurant: restaurantId }).lean();
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

const maskAccountNumber = (accountNumber = '') => (accountNumber ? `**** ${accountNumber.slice(-4)}` : '');

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
  const available = Math.max(0, earnings.credited - wallet.withdrawnTotal);
  const used = usedInWeek(wallet, week);
  const blockedReason = getBlockedReason(restaurant, available, used, week);

  return {
    balance: {
      available,
      pendingSettlement: earnings.pending, // today's delivered orders, credited after the end-of-day reconciliation
      processing: sums.processing,
      withdrawn: sums.succeeded,
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
    payoutAccount: toPayoutAccountView(restaurant.payoutAccount),
    mode: getPayoutMode(),
    canWithdraw: !blockedReason,
    blockedReason,
  };
};

/**
 * Set or change the bank account that receives the withdrawals. Withdrawals already sent keep their own copy.
 * updatedAt of the restaurant is left alone, so an open profile form never gets a false 409.
 * The owner is notified: a changed payout account is the first thing to check after an account takeover.
 */
export const updatePayoutAccount = async (restaurant, ownerId, account) => {
  if (restaurant.status === 'suspended') {
    throw new ApiError(403, 'Quán đang bị tạm ngưng hoạt động nên không thể đổi tài khoản nhận tiền');
  }
  const isChange = hasPayoutAccount(restaurant.payoutAccount);
  const updated = await Restaurant.findOneAndUpdate(
    { _id: restaurant._id },
    { $set: { payoutAccount: account, payoutAccountChangedAt: new Date() } },
    { returnDocument: 'after', runValidators: true, timestamps: false },
  ).select('-businessLicense.fileData');

  await sendRealtimeNotification(ownerId, {
    title: isChange ? 'Tài khoản nhận tiền đã được thay đổi' : 'Đã thêm tài khoản nhận tiền',
    message: `Tiền rút từ ví sẽ chuyển về ${account.bankName} ${maskAccountNumber(account.accountNumber)} – ${account.accountHolder}. Nếu không phải bạn thực hiện, hãy đổi mật khẩu và liên hệ quản trị viên ngay.`,
    type: 'system',
    link: WALLET_LINK,
  });
  return updated;
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
  const available = Math.max(0, earnings.credited - wallet.withdrawnTotal);
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
