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
export const requestWithdrawal = async (restaurant, ownerId, { amount, idempotencyKey }) => {
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
