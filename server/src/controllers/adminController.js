import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Shipper from '../models/Shipper.js';
import ApiError from '../utils/ApiError.js';

export const getPendingApprovals = asyncHandler(async (req, res) => {
  const [pendingRestaurants, pendingShippers] = await Promise.all([
    Restaurant.find({ status: 'pending' }).populate('owner', 'fullName email phone').sort({ createdAt: -1 }),
    Shipper.find({ status: 'pending' }).populate('user', 'fullName email phone').sort({ createdAt: -1 }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      restaurants: pendingRestaurants,
      shippers: pendingShippers,
    },
    message: 'Lấy danh sách chờ phê duyệt thành công',
  });
});

export const updateRestaurantStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw new ApiError(400, 'Trạng thái không hợp lệ');
  }

  const restaurant = await Restaurant.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).populate('owner', 'fullName email phone');

  if (!restaurant) {
    throw new ApiError(404, 'Không tìm thấy nhà hàng');
  }

  res.status(200).json({
    success: true,
    data: restaurant,
    message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} nhà hàng thành công`,
  });
});

export const updateShipperStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw new ApiError(400, 'Trạng thái không hợp lệ');
  }

  const shipper = await Shipper.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).populate('user', 'fullName email phone');

  if (!shipper) {
    throw new ApiError(404, 'Không tìm thấy tài xế');
  }

  res.status(200).json({
    success: true,
    data: shipper,
    message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} tài xế thành công`,
  });
});

export const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalRestaurants, totalShippers, pendingRestaurants, pendingShippers] = await Promise.all([
    User.countDocuments(),
    Restaurant.countDocuments(),
    Shipper.countDocuments(),
    Restaurant.countDocuments({ status: 'pending' }),
    Shipper.countDocuments({ status: 'pending' }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalRestaurants,
      totalShippers,
      pendingRestaurants,
      pendingShippers,
    },
    message: 'Lấy thống kê hệ thống thành công',
  });
});
