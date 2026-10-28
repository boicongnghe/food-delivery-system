import asyncHandler from '../utils/asyncHandler.js';
import * as notificationService from '../services/notificationService.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user._id, req.query);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách thông báo thành công',
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);
  res.status(200).json({
    success: true,
    data: notification,
    message: 'Đã đánh dấu thông báo là đã đọc',
  });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Đã đánh dấu tất cả thông báo là đã đọc',
  });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user._id);
  res.status(200).json({
    success: true,
    message: 'Đã xóa thông báo thành công',
  });
});

export const clearAll = asyncHandler(async (req, res) => {
  await notificationService.clearAllNotifications(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Đã xóa tất cả thông báo',
  });
});
