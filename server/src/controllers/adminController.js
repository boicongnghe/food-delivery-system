import asyncHandler from '../utils/asyncHandler.js';
import * as adminService from '../services/adminService.js';

export const getPendingApprovals = asyncHandler(async (req, res) => {
  const approvals = await adminService.getPendingApprovals();

  res.status(200).json({
    success: true,
    data: approvals,
    message: 'Lấy danh sách chờ phê duyệt thành công',
  });
});

export const getAdminStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getAdminStats();

  res.status(200).json({
    success: true,
    data: stats,
    message: 'Lấy thống kê hệ thống thành công',
  });
});
