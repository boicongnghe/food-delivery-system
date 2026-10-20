import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const registerUser = async ({ fullName, email, password, phone, role }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác.');
  }

  const validRoles = ['customer', 'restaurant_owner', 'shipper'];
  const userRole = role && validRoles.includes(role) ? role : 'customer';

  const newUser = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
    phone: phone ? phone.trim() : '',
    role: userRole,
  });

  const token = generateToken(newUser);

  return {
    token,
    user: newUser.toJSON(),
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Email hoặc mật khẩu không chính xác');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ban quản trị để được hỗ trợ.');
  }

  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    throw new ApiError(401, 'Email hoặc mật khẩu không chính xác');
  }

  const token = generateToken(user);

  return {
    token,
    user: user.toJSON(),
  };
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'Không tìm thấy thông tin tài khoản');
  }

  return user.toJSON();
};
