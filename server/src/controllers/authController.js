import asyncHandler from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, role } = req.body;
  const result = await authService.registerUser({ fullName, email, password, phone, role });

  res.status(201).json({
    success: true,
    data: result,
    message: 'Đăng ký tài khoản thành công',
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password });

  res.status(200).json({
    success: true,
    data: result,
    message: 'Đăng nhập thành công',
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);

  res.status(200).json({
    success: true,
    data: user,
    message: 'Lấy thông tin tài khoản thành công',
  });
});
