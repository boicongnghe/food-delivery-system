import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Notification from './models/Notification.js';

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5173'],
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, role }
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    const userRole = socket.user?.role;

    if (userId) {
      socket.join(`user:${userId}`);
    }
    if (userRole) {
      socket.join(`role:${userRole}`);
    }

    socket.on('disconnect', () => {
      // Clean up if needed
    });
  });

  return io;
};

export const getIo = () => io;

/**
 * Tạo thông báo trong Database và bắn sự kiện realtime tới user cụ thể
 */
export const sendRealtimeNotification = async (recipientId, { title, message, type = 'order', orderId = null, link = '' }) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      title,
      message,
      type,
      order: orderId,
      link,
    });

    if (io) {
      io.to(`user:${recipientId}`).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Error sending realtime notification:', error);
    return null;
  }
};

/**
 * Bắn thông báo theo Role (ví dụ: tất cả shipper)
 */
export const broadcastRealtimeNotification = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};
