import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import ApiError from '../utils/ApiError.js';
import { sendRealtimeNotification } from '../socket.js';

/**
 * Tự động hoàn tiền vào ví ảo của khách hàng khi đơn hàng bị hủy
 */
export const creditWalletRefund = async ({ userId, orderId, orderCode, amount }) => {
  if (!userId || !amount || amount <= 0) return null;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { new: true, runValidators: true },
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
export const requestWithdrawal = async (userId, { amount, bankName, accountNumber, accountHolder }) => {
  const withdrawAmount = Number(amount);
  if (isNaN(withdrawAmount) || withdrawAmount < 10000) {
    throw new ApiError(400, 'Số tiền rút tối thiểu là 10.000đ');
  }

  if (!bankName?.trim() || !accountNumber?.trim() || !accountHolder?.trim()) {
    throw new ApiError(400, 'Vui lòng cung cấp đầy đủ thông tin ngân hàng thụ hưởng');
  }

  // Khóa & trừ số dư ví atomically
  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: withdrawAmount } },
    { $inc: { walletBalance: -withdrawAmount } },
    { new: true, runValidators: true },
  );

  if (!user) {
    throw new ApiError(400, 'Số dư ví khả dụng không đủ để thực hiện yêu cầu rút tiền này');
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
    { new: true, runValidators: true },
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
