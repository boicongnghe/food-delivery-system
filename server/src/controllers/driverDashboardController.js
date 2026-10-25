import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import driverDashboardService from '../services/driverDashboardService.js';

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

const driverDashboardController = {
  getDashboard,
  getSettings,
  updateOnlineStatus,
  updateSettings,
  changePassword,
};

export default driverDashboardController;
