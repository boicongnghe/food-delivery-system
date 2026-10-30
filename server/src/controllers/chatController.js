import asyncHandler from '../utils/asyncHandler.js';
import * as aiChatService from '../services/aiChatService.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Controller: Gửi tin nhắn đến FoodBot AI Assistant
 * Route: POST /api/chat/assistant
 * Quyền: Public (Khách vãng lai lẫn User đã đăng nhập)
 */
export const sendMessageToAssistant = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp nội dung tin nhắn hợp lệ.',
    });
  }

  // Optional authentication check: if Authorization header is present, identify the user
  let currentUser = req.user || null;
  if (!currentUser && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) {
        currentUser = await User.findById(decoded.id).select('fullName email phone role');
      }
    } catch {
      // Ignore token verification errors for optional auth
    }
  }

  const result = await aiChatService.processChatMessage({
    message: message.trim(),
    history: Array.isArray(history) ? history : [],
    user: currentUser,
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

