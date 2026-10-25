import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import ApiError from '../utils/ApiError.js';

const generateTransactionCode = (prefix = 'TXN') => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${dateStr}-${randomSuffix}`;
};

export const processPayment = async (orderId, userId, data = {}) => {
  const { paymentMethod = 'banking', simulateFailure = false } = data;

  if (paymentMethod !== 'banking') {
    throw new ApiError(400, 'Hệ thống hiện tại chỉ chấp nhận thanh toán bằng chuyển khoản ngân hàng');
  }

  const order = await Order.findOne({ _id: orderId, customer: userId });
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng cần thanh toán');
  }

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
      customer: userId,
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
    customer: userId,
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

export const retryPayment = async (orderId, userId, data = {}) => {
  const { paymentMethod = 'banking', simulateFailure = false } = data;

  if (paymentMethod !== 'banking') {
    throw new ApiError(400, 'Hệ thống hiện tại chỉ chấp nhận thanh toán bằng chuyển khoản ngân hàng');
  }

  const order = await Order.findOne({ _id: orderId, customer: userId });
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  if (order.paymentStatus === 'paid') {
    throw new ApiError(400, 'Đơn hàng này đã thanh toán thành công rồi');
  }

  // Find previous failed payment to update retryCount
  const lastPayment = await Payment.findOne({ order: order._id }).sort({ createdAt: -1 });
  const retryCount = (lastPayment?.retryCount || 0) + 1;

  const transactionCode = generateTransactionCode('RETRY');

  if (simulateFailure === true) {
    order.paymentStatus = 'failed';
    order.paymentMethod = paymentMethod;
    await order.save();

    const payment = await Payment.create({
      order: order._id,
      customer: userId,
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
    customer: userId,
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

  return {
    success: true,
    paymentStatus: 'paid',
    retryCount,
    transactionCode,
    message: 'Thanh toán lại thành công!',
    payment,
  };
};

export const getPaymentByOrder = async (orderId) => {
  return Payment.find({ order: orderId }).sort({ createdAt: -1 });
};

export const getPaymentQrInfo = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

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

export const checkPaymentStatus = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

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

  return {
    success: true,
    message: 'Thanh toán đã được ghi nhận thành công!',
    order,
    payment,
  };
};

export const handleSepayWebhook = async (webhookData, authHeader = '') => {
  // 1. Kiểm tra API Key nếu cấu hình trong .env
  const secretKey = process.env.SEPAY_API_KEY;
  if (secretKey && secretKey.trim()) {
    const expectedHeader = `Apikey ${secretKey.trim()}`;
    if (authHeader !== expectedHeader && authHeader !== secretKey.trim()) {
      throw new ApiError(401, 'Unauthorized: Sai SePay API Key');
    }
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
      const formattedOrderNumber = `ORD-${regexMatch[1]}-${regexMatch[2]}`;
      order = await Order.findOne({ orderNumber: formattedOrderNumber });
    }
  }

  // Fallback: Tìm đơn trong danh sách các đơn đang chờ thanh toán (pending) gần nhất
  if (!order) {
    const normalizedContent = content.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const pendingOrders = await Order.find({ paymentStatus: 'pending' })
      .sort({ createdAt: -1 })
      .limit(50);

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
      message: `Không tìm thấy đơn hàng nào khớp với nội dung chuyển khoản: "${content}"`,
    };
  }

  // 3. Kiểm tra số tiền chuyển
  if (amount < order.totalPrice) {
    return {
      success: false,
      message: `Số tiền chuyển (${amount}đ) ít hơn tổng tiền đơn hàng (${order.totalPrice}đ)`,
    };
  }

  const transactionCode = referenceCode || `SEPAY-${sepayId || Date.now()}`;
  return confirmOrderPaid(order, amount, transactionCode, gateway || 'SePay');
};

export const simulateWebhook = async (data = {}) => {
  const { orderId, orderNumber } = data;
  let order = null;

  if (orderId) {
    order = await Order.findById(orderId);
  } else if (orderNumber) {
    order = await Order.findOne({ orderNumber });
  }

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng để giả lập');
  }

  const transactionCode = `SIM-SEPAY-${Date.now().toString().slice(-6)}`;
  return confirmOrderPaid(order, order.totalPrice, transactionCode, 'Mock-SePay');
};
