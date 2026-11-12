import Order from '../models/Order.js';
import OrderMessage from '../models/OrderMessage.js';
import ApiError from '../utils/ApiError.js';
import { getIo } from '../socket.js';

const MESSAGING_STATUSES = new Set(['preparing', 'ready_for_pickup', 'delivering']);
const MESSAGE_HISTORY_LIMIT = 100;

const getAuthorizedOrder = async (orderId, user) => {
  const order = await Order.findById(orderId).select('customer shipper status').lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  const userId = user._id.toString();
  const isCustomer = order.customer.toString() === userId && user.role === 'customer';
  const isAssignedShipper = order.shipper?.toString() === userId && user.role === 'shipper';
  if ((!isCustomer && !isAssignedShipper) || !order.shipper) {
    throw new ApiError(404, 'Không tìm thấy cuộc trò chuyện của đơn hàng');
  }

  return order;
};

export const listOrderMessages = async (orderId, user) => {
  await getAuthorizedOrder(orderId, user);
  const messages = await OrderMessage.find({ order: orderId })
    .sort({ createdAt: -1 })
    .limit(MESSAGE_HISTORY_LIMIT)
    .populate('sender', 'fullName role')
    .lean();

  return messages.reverse();
};

export const createOrderMessage = async (orderId, user, message) => {
  const order = await getAuthorizedOrder(orderId, user);
  if (!MESSAGING_STATUSES.has(order.status)) {
    throw new ApiError(409, 'Chỉ có thể nhắn tin khi đơn hàng đang được giao');
  }

  const created = await OrderMessage.create({
    order: orderId,
    sender: user._id,
    message: message.trim(),
  });
  const populated = await created.populate('sender', 'fullName role');
  const result = populated.toObject();

  const io = getIo();
  if (io) {
    io
      .to(`user:${order.customer}`)
      .to(`user:${order.shipper}`)
      .emit('order_chat_message', result);
  }

  return result;
};
