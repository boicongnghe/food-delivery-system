import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import ApiError from '../utils/ApiError.js';
import { sendRealtimeNotification, emitWalletUpdate } from '../socket.js';

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

const generateTransactionCode = (prefix = 'TXN') => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${dateStr}-${randomSuffix}`;
};

export const processPayment = async (orderId, userOrId, data = {}) => {
  const { paymentMethod = 'banking', simulateFailure = false } = data;

  if (paymentMethod !== 'banking') {
    throw new ApiError(400, 'Hệ thống hiện tại chỉ chấp nhận thanh toán bằng chuyển khoản ngân hàng');
  }

  const order = await findOrderForPayment(orderId, userOrId);

  if (order.status === 'cancelled') {
    throw new ApiError(400, 'Không thể thanh toán cho đơn hàng đã bị hủy');
  }

  if (order.paymentStatus === 'paid') {
    throw new ApiError(400, 'Đơn hàng này đã được thanh toán trước đó');
  }

  const transactionCode = generateTransactionCode('BANKING');

  // Online Payment (Banking / VietQR)
  order.paymentMethod = 'banking';

  // Handle UC16: Payment Failure Simulation
  if (simulateFailure === true) {
    order.paymentStatus = 'failed';
    await order.save();

    const payment = await Payment.create({
      order: order._id,
      customer: order.customer,
      amount: order.totalPrice,
      paymentMethod,
      transactionCode,
      status: 'failed',
      failureReason: 'Giao dịch bị từ chối: Số dư tài khoản không đủ hoặc thẻ bị khóa',
    });

    await OrderStatusHistory.create({
      order: order._id,
      fromStatus: order.status,
      toStatus: order.status,
      action: 'Thanh toán thất bại',
      note: `Giao dịch qua ${paymentMethod.toUpperCase()} không thành công. Khách hàng có thể thanh toán lại.`,
      changedByRole: 'system',
    });

    return {
      success: false,
      paymentStatus: 'failed',
      failureReason: payment.failureReason,
      retryAllowed: true,
      payment,
    };
  }

  // Payment Success
  order.paymentStatus = 'paid';
  await order.save();

  const payment = await Payment.create({
    order: order._id,
    customer: order.customer,
    amount: order.totalPrice,
    paymentMethod,
    transactionCode,
    status: 'success',
    paidAt: new Date(),
  });

  await OrderStatusHistory.create({
    order: order._id,
    fromStatus: order.status,
    toStatus: order.status,
    action: 'Thanh toán thành công',
    note: `Khách hàng đã thanh toán ${order.totalPrice.toLocaleString('vi-VN')}đ qua ${paymentMethod.toUpperCase()} (Mã GD: ${transactionCode})`,
    changedByRole: 'system',
  });

  return {
    success: true,
    paymentStatus: 'paid',
    transactionCode,
    message: 'Thanh toán thành công!',
    payment,
  };
};

export const retryPayment = async (orderId, userOrId, data = {}) => {
  const { paymentMethod = 'banking', simulateFailure = false } = data;

  if (paymentMethod !== 'banking') {
    throw new ApiError(400, 'Hệ thống hiện tại chỉ chấp nhận thanh toán bằng chuyển khoản ngân hàng');
  }

  const order = await findOrderForPayment(orderId, userOrId);

  if (order.paymentStatus === 'paid') {
    throw new ApiError(400, 'Đơn hàng này đã thanh toán thành công rồi');
  }

  // Find previous failed payment to update retryCount
  const lastPayment = await Payment.findOne({ order: order._id, ...buildCustomerFilter(userOrId) }).sort({ createdAt: -1 });
  const retryCount = (lastPayment?.retryCount || 0) + 1;

  const transactionCode = generateTransactionCode('RETRY');

  if (simulateFailure === true) {
    order.paymentStatus = 'failed';
    order.paymentMethod = paymentMethod;
    await order.save();

    const payment = await Payment.create({
      order: order._id,
      customer: order.customer,
      amount: order.totalPrice,
      paymentMethod,
      transactionCode,
      status: 'failed',
      retryCount,
      failureReason: 'Lỗi kết nối tới ngân hàng phát hành thẻ. Vui lòng thử lại sau',
    });

    return {
      success: false,
      paymentStatus: 'failed',
      failureReason: payment.failureReason,
      retryCount,
      payment,
    };
  }

  order.paymentStatus = 'paid';
  order.paymentMethod = paymentMethod;
  await order.save();

  const payment = await Payment.create({
    order: order._id,
    customer: order.customer,
    amount: order.totalPrice,
    paymentMethod,
    transactionCode,
    status: 'success',
    retryCount,
    paidAt: new Date(),
  });

  await OrderStatusHistory.create({
    order: order._id,
    fromStatus: order.status,
    toStatus: order.status,
    action: 'Thanh toán lại thành công',
    note: `Khách hàng thanh toán lại thành công ở lần thử thứ ${retryCount} qua ${paymentMethod.toUpperCase()}`,
    changedByRole: 'system',
  });

  try {
    const restaurant = await Restaurant.findById(order.restaurant);
    const shortCode = (order.orderNumber || order.orderCode || '').split('-').pop();

    if (restaurant?.owner) {
      const recipientName = order.deliveryAddress?.recipientName || order.delivery?.recipientName || 'Khách hàng';
      const itemsCount = order.items?.length || 1;
      sendRealtimeNotification(restaurant.owner, {
        title: `Đơn hàng mới #${shortCode} 🔔`,
        message: `Khách ${recipientName} vừa thanh toán đơn (${itemsCount} món, ${order.totalPrice.toLocaleString('vi-VN')}đ). Bếp kiểm tra ngay!`,
        type: 'order',
        orderId: order._id,
        link: '/restaurant/orders',
      });
    }

    sendRealtimeNotification(order.customer, {
      title: `Đặt hàng thành công #${shortCode} 🎉`,
      message: `Đơn hàng của bạn đã được thanh toán thành công (${order.totalPrice.toLocaleString('vi-VN')}đ) và gửi tới ${restaurant?.name || 'nhà hàng'}. Bếp sẽ xác nhận trong giây lát.`,
      type: 'order',
      orderId: order._id,
      link: `/orders/${order._id}`,
    });
  } catch (notifErr) {
    console.warn('Failed to send notification on retryPayment:', notifErr?.message);
  }

  return {
    success: true,
    paymentStatus: 'paid',
    retryCount,
    transactionCode,
    message: 'Thanh toán lại thành công!',
    payment,
  };
};

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

const confirmOrderPaid = async (order, transferAmount, transactionCode, gateway = 'SePay') => {
  if (order.paymentStatus === 'paid') {
    return {
      success: true,
      message: 'Đơn hàng này đã được xác nhận thanh toán trước đó',
      alreadyPaid: true,
      order,
    };
  }

  order.paymentStatus = 'paid';
  await order.save();

  const payment = await Payment.create({
    order: order._id,
    customer: order.customer,
    amount: transferAmount,
    paymentMethod: 'banking',
    transactionCode,
    status: 'success',
    paidAt: new Date(),
  });

  await OrderStatusHistory.create({
    order: order._id,
    fromStatus: order.status,
    toStatus: order.status,
    action: `Thanh toán thành công (${gateway})`,
    note: `Tài khoản đã nhận ${Number(transferAmount).toLocaleString('vi-VN')}đ (Mã GD: ${transactionCode})`,
    changedByRole: 'system',
  });

  // Khi tiền đã vào tài khoản qua VietQR / Webhook: Bắn thông báo Realtime cho Nhà hàng và Khách hàng
  try {
    const restaurant = await Restaurant.findById(order.restaurant);
    const shortCode = (order.orderNumber || order.orderCode || '').split('-').pop();

    if (restaurant?.owner) {
      const recipientName = order.deliveryAddress?.recipientName || order.delivery?.recipientName || 'Khách hàng';
      const itemsCount = order.items?.length || 1;
      sendRealtimeNotification(restaurant.owner, {
        title: `Đơn hàng mới #${shortCode} 🔔`,
        message: `Khách ${recipientName} vừa thanh toán đơn (${itemsCount} món, ${Number(order.totalPrice || transferAmount).toLocaleString('vi-VN')}đ). Bếp kiểm tra ngay!`,
        type: 'order',
        orderId: order._id,
        link: '/restaurant/orders',
      });
    }

    sendRealtimeNotification(order.customer, {
      title: `Đặt hàng thành công #${shortCode} 🎉`,
      message: `Đơn hàng của bạn đã được thanh toán thành công (${Number(order.totalPrice || transferAmount).toLocaleString('vi-VN')}đ) và gửi tới ${restaurant?.name || 'nhà hàng'}. Bếp sẽ xác nhận trong giây lát.`,
      type: 'order',
      orderId: order._id,
      link: `/orders/${order._id}`,
    });
  } catch (notifErr) {
    console.warn('Failed to send notification on confirmOrderPaid:', notifErr?.message);
  }

  return {
    success: true,
    message: 'Thanh toán đã được ghi nhận thành công!',
    order,
    payment,
  };
};

const resolveWalletDepositTargetUser = async (content = '') => {
  // Tìm theo số điện thoại (ví dụ: NAP VI 0901234567 8639)
  const phoneMatch = content.match(/0\d{9}/);
  if (phoneMatch) {
    const user = await User.findOne({ phone: phoneMatch[0] });
    if (user) return user;
  }

  // Nếu không khớp SĐT 10 số, quét các từ trong content để tìm theo phone hoặc _id
  const words = content.split(/[^a-zA-Z0-9]+/);
  for (const word of words) {
    if (!word) continue;
    if (word.length >= 9) {
      const user = await User.findOne({ phone: word });
      if (user) return user;
    }
    if (/^[0-9a-fA-F]{24}$/.test(word)) {
      const user = await User.findById(word);
      if (user) return user;
    }
  }

  // Nếu người dùng dùng 6 ký tự cuối của _id
  const allUsers = await User.find({}).select('phone _id').lean();
  const upperContent = content.toUpperCase();
  for (const u of allUsers) {
    const idSuffix = u._id.toString().slice(-6).toUpperCase();
    if (upperContent.includes(idSuffix)) {
      return User.findById(u._id);
    }
  }

  return null;
};

const resolveOrderFromWebhookContent = async (content = '', code = '') => {
  if (code) {
    const codeMatch = String(code).match(/ORD[-_\s]?(\d{8})[-_\s]?(\d{4})/i);
    if (codeMatch) {
      const order = await Order.findOne({ orderNumber: `ORD-${codeMatch[1]}-${codeMatch[2]}` });
      if (order) return order;
    }
  }

  const regexMatch = content.match(/ORD[-_\s]?(\d{8})[-_\s]?(\d{4})/i);
  if (regexMatch) {
    const order = await Order.findOne({ orderNumber: `ORD-${regexMatch[1]}-${regexMatch[2]}` });
    if (order) return order;
  }

  const normalizedContent = content.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const pendingOrders = await Order.find({ paymentStatus: 'pending' })
    .sort({ createdAt: -1 })
    .limit(50);

  for (const pendingOrder of pendingOrders) {
    const normalizedOrderNumber = pendingOrder.orderNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (normalizedContent.includes(normalizedOrderNumber)) {
      return pendingOrder;
    }
  }

  return null;
};

export const handleSepayWebhook = async (webhookData, authHeader = '') => {
  // 1. Kiểm tra API Key nếu cấu hình trong .env (bắt buộc ở production)
  const secretKey = process.env.SEPAY_API_KEY;
  if (secretKey && secretKey.trim()) {
    const expectedHeader = `Apikey ${secretKey.trim()}`;
    if (authHeader !== expectedHeader && authHeader !== secretKey.trim()) {
      throw new ApiError(401, 'Unauthorized: Sai SePay API Key');
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new ApiError(503, 'SePay Webhook chưa được cấu hình SEPAY_API_KEY');
  }

  const {
    id: sepayId,
    gateway,
    transactionDate,
    accountNumber,
    code,
    content = '',
    transferType,
    transferAmount,
    referenceCode,
  } = webhookData;

  // Chỉ xử lý giao dịch tiền vào tài khoản
  if (transferType && transferType !== 'in') {
    return { success: false, message: 'Bỏ qua giao dịch không phải tiền vào (transferType !== in)' };
  }

  const amount = Number(transferAmount || 0);
  if (amount <= 0) {
    return { success: false, message: 'Bỏ qua giao dịch số tiền <= 0' };
  }

  // 2. Kiểm tra nếu giao dịch là nạp tiền vào ví ảo (nội dung chứa NAP VI hoặc NAPVI)
  const isWalletDeposit = /NAP[\s_-]?VI/i.test(content) || /NAP[\s_-]?VI/i.test(code || '');
  if (isWalletDeposit) {
    const targetUser = await resolveWalletDepositTargetUser(content);

    if (!targetUser) {
      return {
        success: false,
        message: `Nạp tiền ví thất bại: Không tìm thấy người dùng khớp với nội dung "${content}"`,
      };
    }

    if (targetUser.role !== 'customer') {
      return {
        success: false,
        message: 'Ví ảo chỉ hỗ trợ nạp tiền cho tài khoản khách hàng (customer)',
      };
    }

    const transactionCode = referenceCode || `SEPAY-${sepayId || Date.now()}`;

    // Kiểm tra idempotency: Tránh nạp trùng nếu webhook được gửi lại
    const existingTx = await WalletTransaction.findOne({
      user: targetUser._id,
      description: { $regex: transactionCode },
    });
    if (existingTx) {
      return {
        success: true,
        message: 'Giao dịch nạp tiền này đã được ghi nhận trước đó',
        alreadyProcessed: true,
      };
    }

    // Cộng tiền vào số dư ví của người dùng
    const updatedUser = await User.findOneAndUpdate(
      { _id: targetUser._id, role: 'customer' },
      { $inc: { walletBalance: amount } },
      { returnDocument: 'after', runValidators: true }
    );
    if (!updatedUser) {
      return {
        success: false,
        message: 'Ví ảo chỉ hỗ trợ nạp tiền cho tài khoản khách hàng (customer)',
      };
    }

    // Lưu lịch sử giao dịch ví ảo
    await WalletTransaction.create({
      user: targetUser._id,
      type: 'deposit',
      amount,
      balanceAfter: updatedUser.walletBalance,
      status: 'completed',
      description: `Nạp tiền vào ví qua SePay Webhook (${content}) - Mã GD: ${transactionCode}`,
    });

    // Bắn realtime socket cập nhật số dư ngay lập tức trên Navbar
    emitWalletUpdate(targetUser._id, updatedUser.walletBalance);

    // Gửi thông báo chuông cho khách hàng
    try {
      await sendRealtimeNotification(targetUser._id, {
        title: 'Nạp tiền vào ví thành công 👛',
        message: `Bạn vừa nạp thành công ${amount.toLocaleString('vi-VN')}đ vào Ví ảo qua SePay. Số dư hiện tại: ${updatedUser.walletBalance.toLocaleString('vi-VN')}đ.`,
        type: 'wallet',
        link: '/wallet',
      });
    } catch {}

    return {
      success: true,
      type: 'deposit',
      message: `Đã nạp thành công ${amount.toLocaleString('vi-VN')}đ vào ví người dùng`,
      data: {
        userId: targetUser._id,
        amount,
        newBalance: updatedUser.walletBalance,
        transactionCode,
      },
    };
  }

  // 3. Tìm đơn hàng theo nội dung chuyển khoản hoặc mã giao dịch
  const order = await resolveOrderFromWebhookContent(content, code);

  if (!order) {
    return {
      success: false,
      message: `Không tìm thấy đơn hàng hoặc thông tin nạp tiền nào khớp với nội dung chuyển khoản: "${content}"`,
    };
  }

  // 4. Kiểm tra số tiền chuyển
  if (amount < order.totalPrice) {
    return {
      success: false,
      message: `Số tiền chuyển (${amount}đ) ít hơn tổng tiền đơn hàng (${order.totalPrice}đ)`,
    };
  }

  const transactionCode = referenceCode || `SEPAY-${sepayId || Date.now()}`;
  return confirmOrderPaid(order, amount, transactionCode, gateway || 'SePay');
};

export const simulateWebhook = async (data = {}, user = null) => {
  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(403, 'Chức năng giả lập webhook không khả dụng trên môi trường production');
  }
  if (!user) {
    throw new ApiError(401, 'Vui lòng đăng nhập để thực hiện thao tác này');
  }

  const { orderId, orderNumber, depositCode, content, amount, transferAmount } = data;
  const internalAuthHeader = process.env.SEPAY_API_KEY?.trim()
    ? `Apikey ${process.env.SEPAY_API_KEY.trim()}`
    : '';

  // 1. Nếu là nạp tiền vào ví
  if (depositCode || (content && /NAP[\s_-]?VI/i.test(content))) {
    const depositContent = content || depositCode;
    const targetUser = await resolveWalletDepositTargetUser(depositContent);
    if (!targetUser) {
      throw new ApiError(404, `Không tìm thấy người dùng khớp với nội dung "${depositContent}"`);
    }
    if (targetUser.role !== 'customer') {
      throw new ApiError(403, 'Ví ảo chỉ hỗ trợ nạp tiền cho tài khoản khách hàng');
    }
    if (user.role !== 'admin' && targetUser._id.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Bạn không có quyền giả lập nạp tiền vào ví của người khác');
    }

    const webhookPayload = {
      id: Date.now(),
      gateway: 'TPB',
      transactionDate: new Date().toISOString(),
      accountNumber: process.env.BANK_ACCOUNT_NO || '0393863658',
      transferType: 'in',
      transferAmount: Number(amount || transferAmount || 0),
      content: depositContent,
      referenceCode: `SIM-SEPAY-${Date.now().toString().slice(-6)}`,
    };
    return handleSepayWebhook(webhookPayload, internalAuthHeader);
  }

  // 2. Nếu là thanh toán đơn hàng bằng orderId, orderNumber hoặc content chứa mã đơn
  const customerFilter = buildCustomerFilter(user);
  let order = null;
  if (orderId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'ID đơn hàng không hợp lệ');
    }
    order = await Order.findOne({ _id: orderId, ...customerFilter });
  } else if (orderNumber) {
    order = await Order.findOne({ orderNumber, ...customerFilter });
  } else if (content) {
    const matched = await resolveOrderFromWebhookContent(content);
    if (matched && (user.role === 'admin' || matched.customer?.toString() === user._id.toString())) {
      order = matched;
    }
  }

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng thuộc tài khoản của bạn để giả lập webhook');
  }

  const transactionCode = `SIM-SEPAY-${Date.now().toString().slice(-6)}`;
  return confirmOrderPaid(order, order.totalPrice, transactionCode, 'Mock-SePay');
};
