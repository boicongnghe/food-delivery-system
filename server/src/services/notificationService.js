import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';

export const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false }) => {
  const query = { recipient: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));

  const [items, totalItems, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return {
    items,
    unreadCount,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum),
    },
  };
};

export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Không tìm thấy thông báo hoặc bạn không có quyền');
  }

  return notification;
};

export const markAllAsRead = async (userId) => {
  await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
  return { success: true };
};

export const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new ApiError(404, 'Không tìm thấy thông báo cần xóa');
  }

  return { success: true };
};

export const clearAllNotifications = async (userId) => {
  await Notification.deleteMany({ recipient: userId });
  return { success: true };
};

