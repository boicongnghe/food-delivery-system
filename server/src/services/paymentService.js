import { randomUUID, timingSafeEqual } from 'crypto';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import ApiError from '../utils/ApiError.js';
import { sendRealtimeNotification } from '../socket.js';
import {
  creditDepositFromBank,
  creditWalletRefund,
  findDepositByCode,
  findDepositCode,
  notifyWalletRefund,
} from './walletService.js';

const resolveUserContext = (userOrId) => {
  if (userOrId && typeof userOrId === 'object' && userOrId._id) {
    return { userId: userOrId._id, isAdmin: userOrId.role === 'admin' };
  }
  return { userId: userOrId, isAdmin: false };
};

const buildCustomerFilter = (userOrId) => {
  const { userId, isAdmin } = resolveUserContext(userOrId);
  return isAdmin ? {} : { customer: userId };
};

const findOrderForPayment = async (orderId, userOrId) => {
  const { userId } = resolveUserContext(userOrId);
  if (!userId) {
    throw new ApiError(401, 'Vui lòng đăng nhập để thực hiện thao tác này');
  }
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, 'ID đơn hàng không hợp lệ');
  }
  const order = await Order.findOne({ _id: orderId, ...buildCustomerFilter(userOrId) });
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập');
  }
  return order;
};

// An order is marked paid only by a verified bank webhook (or the dev-only simulation below).
// There is no endpoint that lets a client declare its own order paid.

export const getPaymentByOrder = async (orderId, userOrId) => {
  await findOrderForPayment(orderId, userOrId);
  return Payment.find({ order: orderId, ...buildCustomerFilter(userOrId) }).sort({ createdAt: -1 });
};

export const getPaymentQrInfo = async (orderId, userOrId) => {
  const order = await findOrderForPayment(orderId, userOrId);

  const bankId = (process.env.BANK_ID || 'TPB').trim().toUpperCase();
  const accountNo = (process.env.BANK_ACCOUNT_NO || '0393863658').trim();
  const accountName = (process.env.BANK_ACCOUNT_NAME || 'DO MANH DUONG').trim().toUpperCase();
  const transferContent = order.orderNumber;
  const amount = order.totalPrice;

  // VietQR standard dynamic QR format
  const encodedName = encodeURIComponent(accountName);
  const encodedInfo = encodeURIComponent(transferContent);
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodedInfo}&accountName=${encodedName}`;

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    amount,
    bankId,
    accountNo,
    accountName,
    transferContent,
    qrUrl,
    paymentStatus: order.paymentStatus,
    status: order.status,
  };
};

export const checkPaymentStatus = async (orderId, userOrId) => {
  const order = await findOrderForPayment(orderId, userOrId);

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    status: order.status,
    totalPrice: order.totalPrice,
  };
};

const notifyOrderPaid = async (order, amount) => {
  try {
    const restaurant = await Restaurant.findById(order.restaurant);
    const shortCode = (order.orderNumber || order.orderCode || '').split('-').pop();
    const total = Number(order.totalPrice || amount).toLocaleString('vi-VN');

    if (restaurant?.owner) {
      const recipientName = order.deliveryAddress?.recipientName || order.delivery?.recipientName || 'Khách hàng';
      const itemsCount = order.items?.length || 1;
      sendRealtimeNotification(restaurant.owner, {
        title: `Đơn hàng mới #${shortCode} 🔔`,
        message: `Khách ${recipientName} vừa thanh toán đơn (${itemsCount} món, ${total}đ). Bếp kiểm tra ngay!`,
        type: 'order',
        orderId: order._id,
        link: '/restaurant/orders',
      });
    }

    sendRealtimeNotification(order.customer, {
      title: `Đặt hàng thành công #${shortCode} 🎉`,
      message: `Đơn hàng của bạn đã được thanh toán thành công (${total}đ) và gửi tới ${restaurant?.name || 'nhà hàng'}. Bếp sẽ xác nhận trong giây lát.`,
      type: 'order',
      orderId: order._id,
      link: `/orders/${order._id}`,
    });
  } catch (notifErr) {
    console.warn('Failed to send notification on confirmOrderPaid:', notifErr?.message);
  }
};

/**
 * Record a bank transfer for an order. In one transaction:
 * - the Payment row is inserted first: its transactionCode is unique, so a webhook sent twice is a no-op;
 * - the order turns "paid" only if it is still unpaid and not cancelled (conditional update, no read-then-save);
 * - money that can no longer pay the order (cancelled, or already paid by another transfer) is refunded
 *   to the customer's wallet, so it is never left hanging.
 */
const confirmOrderPaid = async (order, transferAmount, transactionCode, gateway = 'SePay') => {
  const now = new Date();
  const orderCode = order.orderNumber || order.orderCode;
  const session = await mongoose.startSession();
  let paidOrder = null;
  let payment = null;
  let refund = null;

  try {
    await session.withTransaction(async () => {
      paidOrder = null;
      refund = null;
      [payment] = await Payment.create(
        [
          {
            order: order._id,
            customer: order.customer,
            amount: transferAmount,
            paymentMethod: 'banking',
            transactionCode,
            status: 'success',
            paidAt: now,
          },
        ],
        { session },
      );

      // findOneAndUpdate skips the model hook: write the canonical and the legacy fields together
      paidOrder = await Order.findOneAndUpdate(
        { _id: order._id, status: { $ne: 'cancelled' }, 'payment.status': 'unpaid' },
        { $set: { 'payment.status': 'paid', 'payment.paidAt': now, paymentStatus: 'paid' } },
        { returnDocument: 'after', runValidators: true, session },
      );
      if (paidOrder) return;

      await Payment.updateOne({ _id: payment._id }, { $set: { status: 'refunded' } }, { session });
      refund = await creditWalletRefund({
        userId: order.customer,
        orderId: order._id,
        orderCode,
        amount: transferAmount,
        description: `Hoàn tiền chuyển khoản cho đơn #${orderCode} (đơn đã hủy hoặc đã được thanh toán) - Mã GD: ${transactionCode}`,
        externalRef: transactionCode,
        session,
      });
    });
  } catch (error) {
    // Duplicate transactionCode: this bank transaction was recorded before, nothing was changed
    if (error?.code === 11000) {
      return { success: true, alreadyProcessed: true, message: 'Giao dịch này đã được ghi nhận trước đó' };
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (!paidOrder) {
    const current = await Order.findById(order._id).select('status paymentStatus').lean();
    const reason = current?.status === 'cancelled' ? 'đơn đã bị hủy' : 'đơn đã được thanh toán trước đó';
    console.warn(`[payment] Transfer ${transactionCode} for order ${orderCode} refunded to wallet: ${reason}`);

    await OrderStatusHistory.create({
      order: order._id,
      fromStatus: current?.status || order.status,
      toStatus: current?.status || order.status,
      action: `Hoàn tiền chuyển khoản vào ví (${gateway})`,
      note: `Nhận ${Number(transferAmount).toLocaleString('vi-VN')}đ (Mã GD: ${transactionCode}) nhưng ${reason}: đã hoàn vào ví ảo của khách.`,
      changedByRole: 'system',
    });

    if (refund) {
      notifyWalletRefund({
        userId: order.customer,
        orderId: order._id,
        orderCode,
        amount: transferAmount,
        balance: refund.updatedUser.walletBalance,
      });
    }

    return {
      success: true,
      refunded: Boolean(refund),
      message: `Không thể ghi nhận thanh toán vì ${reason}. Số tiền đã được hoàn vào ví ảo của khách.`,
      payment,
    };
  }

  await OrderStatusHistory.create({
    order: paidOrder._id,
    fromStatus: paidOrder.status,
    toStatus: paidOrder.status,
    action: `Thanh toán thành công (${gateway})`,
    note: `Tài khoản đã nhận ${Number(transferAmount).toLocaleString('vi-VN')}đ (Mã GD: ${transactionCode})`,
    changedByRole: 'system',
  });

  await notifyOrderPaid(paidOrder, transferAmount);

  return {
    success: true,
    message: 'Thanh toán đã được ghi nhận thành công!',
    order: paidOrder,
    payment,
  };
};

const isSameSecret = (received, expected) => {
  const a = Buffer.from(String(received));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** SePay sends "Authorization: Apikey <key>". Without a configured key every call is refused. */
const verifySepayApiKey = (authHeader = '') => {
  const secretKey = (process.env.SEPAY_API_KEY || '').trim();
  if (!secretKey) {
    console.error('[payment] SEPAY_API_KEY is not set: SePay webhook refused');
    throw new ApiError(401, 'Unauthorized: SePay webhook chưa được cấu hình API key');
  }
  if (!isSameSecret(authHeader, `Apikey ${secretKey}`) && !isSameSecret(authHeader, secretKey)) {
    throw new ApiError(401, 'Unauthorized: Sai SePay API Key');
  }
};

/** Apply one incoming bank transfer (already authenticated) to a wallet deposit or an order */
const processBankTransfer = async (webhookData) => {
  const { id: sepayId, gateway, code, content = '', transferType, transferAmount, referenceCode } = webhookData;

  // Chỉ xử lý giao dịch tiền vào tài khoản
  if (transferType && transferType !== 'in') {
    return { success: false, message: 'Bỏ qua giao dịch không phải tiền vào (transferType !== in)' };
  }

  const amount = Number(transferAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, message: 'Bỏ qua giao dịch số tiền <= 0' };
  }

  // The bank reference is the idempotency key: without it a retried webhook could be applied twice
  const transactionCode = referenceCode || (sepayId ? `SEPAY-${sepayId}` : null);
  if (!transactionCode) {
    return { success: false, message: 'Bỏ qua giao dịch không có mã tham chiếu (referenceCode / id)' };
  }

  // 1. Nạp tiền vào ví: chỉ khớp theo mã nạp đã lưu lúc tạo yêu cầu (NAPVIxxxxxxxx)
  const depositCode = findDepositCode(content) || findDepositCode(code);
  if (depositCode) {
    return creditDepositFromBank({
      code: depositCode,
      amount,
      externalRef: transactionCode,
      source: gateway || 'SePay',
    });
  }

  // 2. Tìm đơn hàng theo nội dung chuyển khoản hoặc mã giao dịch
  let order = null;

  // Thử khớp từ trường code nếu SePay đã bóc tách
  if (code) {
    const codeMatch = String(code).match(/ORD[-_\s]?(\d{8})[-_\s]?(\d{4})/i);
    if (codeMatch) {
      order = await Order.findOne({ orderNumber: `ORD-${codeMatch[1]}-${codeMatch[2]}` });
    }
  }

  // Thử khớp regex ORD-xxxxxxxx-xxxx từ content
  if (!order) {
    const regexMatch = content.match(/ORD[-_\s]?(\d{8})[-_\s]?(\d{4})/i);
    if (regexMatch) {
      order = await Order.findOne({ orderNumber: `ORD-${regexMatch[1]}-${regexMatch[2]}` });
    }
  }

  // Fallback: Tìm đơn trong danh sách các đơn đang chờ thanh toán (pending) gần nhất
  if (!order) {
    const normalizedContent = content.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const pendingOrders = await Order.find({ paymentStatus: 'pending' }).sort({ createdAt: -1 }).limit(50);

    for (const pendingOrder of pendingOrders) {
      const normalizedOrderNumber = pendingOrder.orderNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (normalizedContent.includes(normalizedOrderNumber)) {
        order = pendingOrder;
        break;
      }
    }
  }

  if (!order) {
    return {
      success: false,
      message: `Không tìm thấy đơn hàng hoặc mã nạp tiền nào khớp với nội dung chuyển khoản: "${content}"`,
    };
  }

  // 3. Kiểm tra số tiền chuyển
  if (amount < order.totalPrice) {
    return {
      success: false,
      message: `Số tiền chuyển (${amount}đ) ít hơn tổng tiền đơn hàng (${order.totalPrice}đ)`,
    };
  }

  return confirmOrderPaid(order, amount, transactionCode, gateway || 'SePay');
};

export const handleSepayWebhook = async (webhookData, authHeader = '') => {
  verifySepayApiKey(authHeader);
  return processBankTransfer(webhookData || {});
};

/* ----- Giả lập webhook (chỉ môi trường dev / demo) ----- */

// Off unless ENABLE_PAYMENT_SIMULATION=true, and never in production whatever the flag says
export const isPaymentSimulationEnabled = () =>
  process.env.ENABLE_PAYMENT_SIMULATION === 'true' && process.env.NODE_ENV !== 'production';

const simulationReference = () => `SIM-${randomUUID().slice(0, 12).toUpperCase()}`;

/**
 * Pretend the bank received the transfer of the caller's own order or deposit request, for the amount the
 * server stored (never an amount sent by the client). An admin may simulate for anyone.
 */
export const simulateWebhook = async (user, data = {}) => {
  if (!isPaymentSimulationEnabled()) {
    throw new ApiError(404, 'Chức năng giả lập thanh toán đang tắt');
  }
  const isAdmin = user.role === 'admin';
  const { orderId, depositCode } = data;

  if (depositCode) {
    const code = findDepositCode(depositCode);
    const deposit = code ? await findDepositByCode(code) : null;
    if (!deposit || (!isAdmin && String(deposit.user) !== String(user._id))) {
      throw new ApiError(404, 'Không tìm thấy yêu cầu nạp tiền');
    }
    if (deposit.status !== 'pending') {
      throw new ApiError(409, 'Yêu cầu nạp tiền này đã được ghi nhận');
    }
    return creditDepositFromBank({
      code: deposit.code,
      amount: deposit.amount,
      externalRef: simulationReference(),
      source: 'Mock-SePay',
    });
  }

  if (orderId) {
    if (!mongoose.isValidObjectId(orderId)) {
      throw new ApiError(404, 'Không tìm thấy đơn hàng');
    }
    const order = await Order.findOne(isAdmin ? { _id: orderId } : { _id: orderId, customer: user._id });
    if (!order) {
      throw new ApiError(404, 'Không tìm thấy đơn hàng');
    }
    if (order.status === 'cancelled') {
      throw new ApiError(400, 'Không thể thanh toán cho đơn hàng đã bị hủy');
    }
    if (order.paymentStatus === 'paid') {
      throw new ApiError(409, 'Đơn hàng này đã được thanh toán trước đó');
    }
    return confirmOrderPaid(order, order.totalPrice, simulationReference(), 'Mock-SePay');
  }

  throw new ApiError(400, 'Cần orderId hoặc depositCode để giả lập webhook');
};
