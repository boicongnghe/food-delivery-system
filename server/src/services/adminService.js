import Restaurant from '../models/Restaurant.js';
import Shipper from '../models/Shipper.js';
import User from '../models/User.js';

// Admin dashboard: partner approval queue and system counters.
// Decisions are made in adminPartnerService, after reviewing the full registration.

export const getPendingApprovals = async () => {
  const [restaurants, shippers] = await Promise.all([
    Restaurant.find({ status: 'pending' })
      .select('-businessLicense.fileData') // a license file can weigh several MB
      .populate('owner', 'fullName email phone')
      .sort({ createdAt: 1 })
      .lean(),
    Shipper.find({ status: 'pending' })
      .select('-vehicleRegistration.fileData -vehicleInsurance.fileData')
      .populate('user', 'fullName email phone')
      .sort({ createdAt: 1 })
      .lean(),
  ]);
  return { restaurants, shippers };
};

export const getAdminStats = async () => {
  const [totalUsers, totalRestaurants, totalShippers, pendingRestaurants, pendingShippers] = await Promise.all([
    User.countDocuments(),
    Restaurant.countDocuments(),
    Shipper.countDocuments(),
    Restaurant.countDocuments({ status: 'pending' }),
    Shipper.countDocuments({ status: 'pending' }),
  ]);
  return { totalUsers, totalRestaurants, totalShippers, pendingRestaurants, pendingShippers };
};
