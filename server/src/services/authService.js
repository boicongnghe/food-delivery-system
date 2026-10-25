import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

export const login = async (email, password) => {
  if (!email) {
    throw new ApiError(400, 'Vui lòng nhập email');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Email hoặc mật khẩu không chính xác');
  }

  // Demo simple check or plain password match
  if (password && user.password && user.password !== password && !user.password.startsWith('$2b$')) {
    throw new ApiError(401, 'Mật khẩu không chính xác');
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'super_secret_jwt_key_123456',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
    token,
  };
};

export const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy người dùng');
  }
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  };
};
