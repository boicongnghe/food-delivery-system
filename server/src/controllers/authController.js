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
    message: result.message || 'Đăng ký tài khoản thành công. Vui lòng kiểm tra email để kích hoạt.',
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;
  const result = await authService.verifyEmail(token);

  res.status(200).json({
    success: true,
    data: result,
    message: result.message,
  });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendVerificationEmail(email);

  res.status(200).json({
    success: true,
    data: result,
    message: result.message,
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

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken, accessToken } = req.body;
  const result = await authService.loginWithGoogle({ idToken, accessToken });

  res.status(200).json({
    success: true,
    data: result,
    message: result.message,
  });
});

export const facebookLogin = asyncHandler(async (req, res) => {
  const { accessToken, userID } = req.body;
  const result = await authService.loginWithFacebook({ accessToken, userID });

  res.status(200).json({
    success: true,
    data: result,
    message: result.message,
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

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user._id, { currentPassword, newPassword });

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await authService.getUserAddresses(req.user._id);
  res.status(200).json({
    success: true,
    data: addresses,
    message: 'Lấy danh sách địa chỉ thành công',
  });
});

export const addAddress = asyncHandler(async (req, res) => {
  const addresses = await authService.addUserAddress(req.user._id, req.body);
  res.status(201).json({
    success: true,
    data: addresses,
    message: 'Thêm địa chỉ giao hàng thành công',
  });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const addresses = await authService.updateUserAddress(req.user._id, req.params.addressId, req.body);
  res.status(200).json({
    success: true,
    data: addresses,
    message: 'Cập nhật địa chỉ thành công',
  });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const addresses = await authService.deleteUserAddress(req.user._id, req.params.addressId);
  res.status(200).json({
    success: true,
    data: addresses,
    message: 'Xóa địa chỉ thành công',
  });
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const addresses = await authService.setDefaultUserAddress(req.user._id, req.params.addressId);
  res.status(200).json({
    success: true,
    data: addresses,
    message: 'Đã đặt làm địa chỉ mặc định',
  });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const result = await authService.deleteCustomerAccount(req.user._id, req.body);
  res.status(200).json({
    success: true,
    data: result,
    message: result.message || 'Xóa tài khoản thành công',
  });
});
