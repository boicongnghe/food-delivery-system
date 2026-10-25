import asyncHandler from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, role, restaurantDetails, shipperDetails } = req.body;
  const result = await authService.registerUser({
    fullName,
    email,
    password,
    phone,
    role,
    restaurantDetails,
    shipperDetails,
  });

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

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);

  res.status(200).json({
    success: true,
    data: result,
    message: result.message,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const result = await authService.resetPassword({ email, otp, newPassword });

  res.status(200).json({
    success: true,
    data: result,
    message: result.message,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await authService.updateUserProfile(req.user._id, req.body);

  res.status(200).json({
    success: true,
    data: updatedUser,
    message: 'Cập nhật thông tin cá nhân thành công',
  });
});
