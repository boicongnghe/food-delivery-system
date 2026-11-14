import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import driverDashboardService from '../services/driverDashboardService.js';
import * as deliveryIssueService from '../services/deliveryIssueService.js';
import * as shipperApplicationService from '../services/shipperApplicationService.js';
import * as shipperWalletService from '../services/shipperWalletService.js';

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await driverDashboardService.getDashboard(
    req.user.id,
    req.query.period || 'today',
  );

  res.status(200).json({
    success: true,
    data: dashboard,
    message: 'Get driver dashboard successfully',
  });
});

const getSettings = asyncHandler(async (req, res) => {
  const settings = await driverDashboardService.getSettings(req.user.id);

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Get driver settings successfully',
  });
});

const updateOnlineStatus = asyncHandler(async (req, res) => {
  if (typeof req.body?.isOnline !== 'boolean') {
    throw new ApiError(400, 'isOnline must be a boolean');
  }

  const status = await driverDashboardService.updateOnlineStatus(
    req.user.id,
    req.body.isOnline,
  );

  res.status(200).json({
    success: true,
    data: status,
    message: 'Update driver status successfully',
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await driverDashboardService.updateSettings(req.user.id, req.body);

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Update driver settings successfully',
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await driverDashboardService.changePassword(req.user.id, req.body);

  res.status(200).json({
    success: true,
    data: result,
    message: result.message,
  });
});

const requestWithdrawal = asyncHandler(async (req, res) => {
  const result = await shipperWalletService.requestWithdrawal(req.user.id, req.body.amount);
  res.status(201).json({
    success: true,
    data: result,
    message: 'Đã gửi yêu cầu rút tiền, vui lòng chờ quản trị viên chuyển khoản',
  });
});

const listWithdrawals = asyncHandler(async (req, res) => {
  const result = await shipperWalletService.listMyWithdrawals(req.user.id, req.query);
  res.status(200).json({ success: true, data: result, message: 'Lấy lịch sử rút tiền thành công' });
});

const getApplication = asyncHandler(async (req, res) => {
  const application = await shipperApplicationService.getMyApplication(req.user.id);
  res.status(200).json({ success: true, data: application, message: 'Lấy hồ sơ tài xế thành công' });
});

const resubmitApplication = asyncHandler(async (req, res) => {
  const application = await shipperApplicationService.resubmitApplication(req.user.id, req.body);
  res.status(200).json({
    success: true,
    data: application,
    message: application.status === 'pending' ? 'Đã gửi lại hồ sơ, vui lòng chờ quản trị viên duyệt' : 'Đã lưu hồ sơ',
  });
});

const listDeliveryIssues = asyncHandler(async (req, res) => {
  const result = await deliveryIssueService.listMyDeliveryIssues(req.user.id, req.query);
  res.status(200).json({ success: true, data: result, message: 'Lấy danh sách báo cáo sự cố thành công' });
});

const driverDashboardController = {
  getDashboard,
  getSettings,
  updateOnlineStatus,
  updateSettings,
  changePassword,
  requestWithdrawal,
  listWithdrawals,
  getApplication,
  resubmitApplication,
  listDeliveryIssues,
};

export default driverDashboardController;
