import DriverDashboard from '../models/DriverDashboard.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { sendRealtimeNotification } from '../socket.js';

/**
 * Bank accounts that receive wallet withdrawals: restaurants (restaurants.payoutAccounts) and customers /
 * shippers (users.payoutAccounts) follow the same rules:
 * - at most MAX_PAYOUT_ACCOUNTS, no duplicate bank + account number
 * - exactly one default while the list is not empty; withdrawals go to the default one
 * - the default can only be removed when it is the last account (pick another default first)
 */

export const MAX_PAYOUT_ACCOUNTS = 5;

export const maskAccountNumber = (accountNumber = '') => (accountNumber ? `**** ${accountNumber.slice(-4)}` : '');

export const hasPayoutAccount = (account = {}) => Boolean(account?.bankName && account?.accountNumber && account?.accountHolder);

export const accountFields = (account = {}) => ({
  bankName: account.bankName,
  accountNumber: account.accountNumber,
  accountHolder: account.accountHolder,
});

const toAccountView = (account) => ({
  _id: account._id,
  bankName: account.bankName,
  accountNumber: maskAccountNumber(account.accountNumber),
  accountHolder: account.accountHolder,
  isDefault: account.isDefault,
});

// Masked list, default first then oldest first
export const toAccountsView = (accounts = []) =>
  [...accounts]
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || new Date(a.createdAt) - new Date(b.createdAt))
    .map(toAccountView);

export const defaultAccountOf = (accounts = []) => accounts.find((account) => account.isDefault) || null;

// ---------- Changes on a loaded document that has a payoutAccounts array (restaurant or user)

export const findAccount = (doc, accountId) => {
  const account = doc.payoutAccounts.id(accountId);
  if (!account) {
    throw new ApiError(404, 'Không tìm thấy tài khoản ngân hàng');
  }
  return account;
};

export const markDefault = (doc, account) => {
  for (const item of doc.payoutAccounts) item.isDefault = String(item._id) === String(account._id);
};

/** @returns {{ account: object, becameDefault: boolean }} */
export const pushAccount = (doc, fields, makeDefault = false) => {
  if (doc.payoutAccounts.length >= MAX_PAYOUT_ACCOUNTS) {
    throw new ApiError(409, `Chỉ lưu được tối đa ${MAX_PAYOUT_ACCOUNTS} tài khoản ngân hàng. Hãy xóa bớt tài khoản không dùng.`);
  }
  const duplicate = doc.payoutAccounts.some(
    (account) => account.accountNumber === fields.accountNumber && account.bankName.toLowerCase() === fields.bankName.toLowerCase(),
  );
  if (duplicate) {
    throw new ApiError(409, 'Tài khoản này đã có trong danh sách', [{ field: 'accountNumber', message: 'Tài khoản này đã có trong danh sách' }]);
  }
  const becameDefault = makeDefault || doc.payoutAccounts.length === 0;
  doc.payoutAccounts.push({ ...accountFields(fields), isDefault: false });
  const account = doc.payoutAccounts[doc.payoutAccounts.length - 1];
  if (becameDefault) markDefault(doc, account);
  return { account, becameDefault };
};

export const pullAccount = (doc, accountId) => {
  const account = findAccount(doc, accountId);
  if (account.isDefault && doc.payoutAccounts.length > 1) {
    throw new ApiError(409, 'Đây là tài khoản mặc định. Hãy chọn tài khoản mặc định khác trước khi xóa.');
  }
  doc.payoutAccounts.pull(account._id);
};

// Save without touching updatedAt; two changes at once on the list -> 409 instead of losing one
export const saveAccountsDoc = async (doc) => {
  try {
    await doc.save({ timestamps: false });
  } catch (error) {
    if (error.name === 'VersionError') {
      throw new ApiError(409, 'Danh sách tài khoản vừa được thay đổi ở nơi khác, vui lòng tải lại');
    }
    throw error;
  }
};

// A new default decides where the money goes: the owner is told, in case it was not them
export const notifyDefaultChange = (userId, account, title, link) =>
  sendRealtimeNotification(userId, {
    title,
    message: `Tiền rút từ ví sẽ chuyển về ${account.bankName} ${maskAccountNumber(account.accountNumber)} – ${account.accountHolder}. Nếu không phải bạn thực hiện, hãy đổi mật khẩu và liên hệ quản trị viên ngay.`,
    type: 'system',
    link,
  });

// ---------- Customers and shippers (users.payoutAccounts)

const walletLinkOf = (role) => (role === 'shipper' ? '/shipper' : '/wallet');

/**
 * The user with an account list ready. A shipper who set a bank in the old settings form
 * (driverdashboards.profile) has it moved into the list once, as the default account.
 */
const loadUser = async (userId) => {
  const user = await User.findById(userId).select('role isActive payoutAccounts');
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }
  if (user.payoutAccounts.length === 0 && user.role === 'shipper') {
    const dashboard = await DriverDashboard.findOne({ userId }).select('profile').lean();
    const legacy = {
      bankName: dashboard?.profile?.bankName,
      accountNumber: dashboard?.profile?.bankAccountNumber,
      accountHolder: dashboard?.profile?.bankAccountName,
    };
    if (hasPayoutAccount(legacy)) {
      user.payoutAccounts.push({ ...legacy, isDefault: true });
      await saveAccountsDoc(user);
      // Moved, not copied: an account the shipper deletes later must not come back from the old fields
      await DriverDashboard.updateOne(
        { userId },
        { $set: { 'profile.bankName': '', 'profile.bankAccountName': '', 'profile.bankAccountNumber': '' } },
      );
    }
  }
  return user;
};

export const listUserPayoutAccounts = async (userId) => {
  const user = await loadUser(userId);
  return { accounts: toAccountsView(user.payoutAccounts), maxAccounts: MAX_PAYOUT_ACCOUNTS };
};

/** Plain default account of a customer / shipper (null when none): the destination of a withdrawal */
export const getUserDefaultAccount = async (userId) => {
  const user = await loadUser(userId);
  const account = defaultAccountOf(user.payoutAccounts);
  return account ? accountFields(account) : null;
};

export const addUserPayoutAccount = async (userId, { makeDefault, ...fields }) => {
  const user = await loadUser(userId);
  const { account, becameDefault } = pushAccount(user, fields, makeDefault);
  await saveAccountsDoc(user);
  await notifyDefaultChange(
    userId,
    account,
    becameDefault ? 'Tài khoản nhận tiền mặc định đã thay đổi' : 'Đã thêm tài khoản ngân hàng',
    walletLinkOf(user.role),
  );
  return toAccountsView(user.payoutAccounts);
};

export const setUserDefaultPayoutAccount = async (userId, accountId) => {
  const user = await loadUser(userId);
  const account = findAccount(user, accountId);
  if (!account.isDefault) {
    markDefault(user, account);
    await saveAccountsDoc(user);
    await notifyDefaultChange(userId, account, 'Tài khoản nhận tiền mặc định đã thay đổi', walletLinkOf(user.role));
  }
  return toAccountsView(user.payoutAccounts);
};

export const removeUserPayoutAccount = async (userId, accountId) => {
  const user = await loadUser(userId);
  pullAccount(user, accountId);
  await saveAccountsDoc(user);
  return toAccountsView(user.payoutAccounts);
};
