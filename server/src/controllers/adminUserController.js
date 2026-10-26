import asyncHandler from '../utils/asyncHandler.js';
import * as adminUserService from '../services/adminUserService.js';

// UC37 - Manage accounts

export const listUsers = asyncHandler(async (req, res) => {
  const result = await adminUserService.listUsers(req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách tài khoản thành công',
  });
});

export const getUserDetail = asyncHandler(async (req, res) => {
  const detail = await adminUserService.getUserDetail(req.params.id);

  res.status(200).json({
    success: true,
    data: detail,
    message: 'Lấy chi tiết tài khoản thành công',
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const detail = await adminUserService.updateUserRole(req.user._id, req.params.id, req.body.role);

  res.status(200).json({
    success: true,
    data: detail,
    message: `Đã cập nhật vai trò cho ${detail.user.fullName}`,
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const detail = await adminUserService.updateUserStatus(req.user._id, req.params.id, req.body.isActive);

  res.status(200).json({
    success: true,
    data: detail,
    message: detail.user.isActive
      ? `Đã mở khóa tài khoản ${detail.user.fullName}`
      : `Đã khóa tài khoản ${detail.user.fullName}`,
  });
});
