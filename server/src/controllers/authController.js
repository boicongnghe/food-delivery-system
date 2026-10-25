import asyncHandler from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await authService.login(email, password);
  res.status(200).json({
    success: true,
    data,
    message: 'Đăng nhập thành công',
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  res.status(200).json({
    success: true,
    data: user,
    message: 'Thông tin tài khoản',
  });
});
