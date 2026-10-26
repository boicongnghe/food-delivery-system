import Complaint from '../models/Complaint.js';
import DeliveryIssue from '../models/DeliveryIssue.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Review from '../models/Review.js';
import Shipper from '../models/Shipper.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';

const UNFINISHED_ORDER_STATUSES = ['pending', 'preparing', 'ready_for_pickup', 'delivering'];
const STATUS_FILTERS = { all: {}, active: { isActive: true }, locked: { isActive: false } };

export const listUsers = async ({ page, limit, keyword, role, status }) => {
  const baseFilter = role === 'all' ? {} : { role };
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    baseFilter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }
  const filter = { ...baseFilter, ...STATUS_FILTERS[status] };

  const [items, totalItems, groups] = await Promise.all([
    User.find(filter)
      .select('fullName email phone role avatar isActive createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
    User.aggregate([{ $match: baseFilter }, { $group: { _id: '$isActive', count: { $sum: 1 } } }]),
  ]);

  const active = groups.find((group) => group._id === true)?.count || 0;
  const locked = groups.find((group) => group._id === false)?.count || 0;
  return { ...toPage(items, { page, limit }, totalItems), counts: { all: active + locked, active, locked } };
};

const summarizeOrders = async (match) => {
  const [result] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        deliveredValue: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } },
      },
    },
  ]);
  const { totalOrders = 0, deliveredOrders = 0, cancelledOrders = 0, deliveredValue = 0 } = result || {};
  return { totalOrders, deliveredOrders, cancelledOrders, deliveredValue };
};

export const getUserDetail = async (userId) => {
  const user = await User.findById(userId).select('-resetPasswordOtp -resetPasswordExpires').lean();
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }

  const violationFilter = { 'resolution.penalty.targetUser': user._id };
  const [restaurant, shipperProfile, violationTotal, violations] = await Promise.all([
    Restaurant.findOne({ owner: user._id }).select('name status rating ratingCount address phone createdAt').lean(),
    Shipper.findOne({ user: user._id }).select('status vehicleInfo rating isOnline createdAt').lean(),
    DeliveryIssue.countDocuments(violationFilter),
    DeliveryIssue.find(violationFilter)
      .select('code orderCode type resolution.penalty resolution.note resolution.at')
      .sort({ 'resolution.at': -1 })
      .limit(10)
      .lean(),
  ]);

  // Orders placed (customer), received (restaurant owner) or delivered (shipper)
  const orderMatch = {
    customer: { customer: user._id },
    restaurant_owner: restaurant && { restaurant: restaurant._id },
    shipper: { shipper: user._id },
  }[user.role];
  const isCustomer = user.role === 'customer';
  const [orderStats, reviewCount, complaintCount] = await Promise.all([
    orderMatch ? summarizeOrders(orderMatch) : null,
    isCustomer ? Review.countDocuments({ customer: user._id }) : 0,
    isCustomer ? Complaint.countDocuments({ customer: user._id }) : 0,
  ]);

  return {
    user,
    restaurant,
    shipperProfile,
    orderStats,
    feedback: { reviews: reviewCount, complaints: complaintCount },
    violations: { total: violationTotal, items: violations },
  };
};

const ensureNotSelf = (adminId, userId, message) => {
  if (String(adminId) === String(userId)) {
    throw new ApiError(409, message);
  }
};

// A role change must not leave data behind that the new role can no longer reach
const ensureRoleCanChange = async (user) => {
  if (user.role === 'restaurant_owner') {
    const restaurant = await Restaurant.findOne({ owner: user._id }).select('name').lean();
    if (restaurant) {
      throw new ApiError(409, `Tài khoản đang sở hữu nhà hàng "${restaurant.name}", không thể đổi vai trò`);
    }
  }
  if (user.role === 'shipper' && (await Order.exists({ shipper: user._id, status: { $in: ['ready_for_pickup', 'delivering'] } }))) {
    throw new ApiError(409, 'Shipper đang có đơn chưa giao xong, không thể đổi vai trò');
  }
  if (user.role === 'customer' && (await Order.exists({ customer: user._id, status: { $in: UNFINISHED_ORDER_STATUSES } }))) {
    throw new ApiError(409, 'Khách hàng đang có đơn chưa hoàn tất, không thể đổi vai trò');
  }
};

export const updateUserRole = async (adminId, userId, role) => {
  ensureNotSelf(adminId, userId, 'Bạn không thể tự thay đổi vai trò của chính mình');

  const user = await User.findById(userId).select('role').lean();
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }
  if (user.role === role) {
    throw new ApiError(409, 'Tài khoản đã có vai trò này');
  }
  await ensureRoleCanChange(user);

  // Conditional on the old role: two admins changing the same account at once cannot both win
  const updated = await User.findOneAndUpdate({ _id: userId, role: user.role }, { $set: { role } });
  if (!updated) {
    throw new ApiError(409, 'Vai trò của tài khoản vừa được thay đổi, vui lòng tải lại');
  }
  return getUserDetail(userId);
};

// A locked account can neither log in nor use an existing token (protect checks isActive)
export const updateUserStatus = async (adminId, userId, isActive) => {
  ensureNotSelf(adminId, userId, 'Bạn không thể tự khóa hoặc mở khóa tài khoản của chính mình');

  const updated = await User.findOneAndUpdate({ _id: userId, isActive: !isActive }, { $set: { isActive } });
  if (!updated) {
    if (!(await User.exists({ _id: userId }))) {
      throw new ApiError(404, 'Không tìm thấy tài khoản');
    }
    throw new ApiError(409, isActive ? 'Tài khoản đang hoạt động' : 'Tài khoản đã bị khóa trước đó');
  }
  return getUserDetail(userId);
};
