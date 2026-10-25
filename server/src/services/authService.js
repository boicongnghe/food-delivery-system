import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Shipper from '../models/Shipper.js';
import ApiError from '../utils/ApiError.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Helper: bổ sung thông tin từ collection 'restaurants' hoặc 'shippers' vào user object trả về
const enrichUserData = async (user) => {
  if (!user) return null;
  const userObj = user.toJSON ? user.toJSON() : { ...user };

  if (user.role === 'restaurant_owner') {
    const restaurant = await Restaurant.findOne({
      $or: [{ owner: user._id }, { user: user._id }],
    });
    if (restaurant) {
      userObj.restaurantDetails = {
        _id: restaurant._id,
        restaurantName: restaurant.name || restaurant.restaurantName,
        restaurantAddress: restaurant.address || restaurant.restaurantAddress,
        businessItems: restaurant.businessItems || restaurant.description,
        ownerCitizenId: restaurant.ownerCitizenId,
        businessLicense: restaurant.businessLicense,
        rating: restaurant.rating,
        status: restaurant.status,
        image: restaurant.image,
      };
    }
  } else if (user.role === 'shipper') {
    const shipper = await Shipper.findOne({ user: user._id });
    if (shipper) {
      userObj.shipperDetails = {
        _id: shipper._id,
        dateOfBirth: shipper.dateOfBirth,
        citizenId: shipper.citizenId,
        vehicleInfo: shipper.vehicleInfo,
        vehicleRegistration: shipper.vehicleRegistration,
        vehicleInsurance: shipper.vehicleInsurance,
        isOnline: shipper.isOnline,
        status: shipper.status,
      };
    }
  }

  return userObj;
};

export const registerUser = async ({
  fullName,
  email,
  password,
  phone,
  role,
  restaurantDetails,
  shipperDetails,
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác.');
  }

  const validRoles = ['customer', 'restaurant_owner', 'shipper'];
  const userRole = role && validRoles.includes(role) ? role : 'customer';

  // 1. Lưu tài khoản người dùng vào collection 'users'
  const userDataToCreate = {
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
    phone: phone ? phone.trim() : '',
    role: userRole,
  };

  const newUser = await User.create(userDataToCreate);

  // 2. Lưu trực tiếp vào collection 'restaurants' nếu là tài khoản nhà hàng
  if (userRole === 'restaurant_owner' && restaurantDetails) {
    await Restaurant.create({
      owner: newUser._id,
      user: newUser._id,
      name: restaurantDetails.restaurantName || fullName.trim(),
      address: restaurantDetails.restaurantAddress || '',
      phone: phone ? phone.trim() : '',
      description: restaurantDetails.businessItems || '',
      businessItems: restaurantDetails.businessItems || '',
      ownerCitizenId: restaurantDetails.ownerCitizenId || '',
      businessLicense: restaurantDetails.businessLicense || null,
      status: 'approved',
    });
  }

  // 3. Lưu trực tiếp vào collection 'shippers' nếu là tài khoản shipper
  if (userRole === 'shipper' && shipperDetails) {
    await Shipper.create({
      user: newUser._id,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      dateOfBirth: shipperDetails.dateOfBirth || '',
      citizenId: shipperDetails.citizenId || '',
      vehicleInfo: shipperDetails.vehicleInfo || '',
      vehicleRegistration: shipperDetails.vehicleRegistration || null,
      vehicleInsurance: shipperDetails.vehicleInsurance || null,
      isOnline: true,
      status: 'approved',
    });
  }

  const token = generateToken(newUser);
  const enrichedUser = await enrichUserData(newUser);

  return {
    token,
    user: enrichedUser,
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Email hoặc mật khẩu không chính xác');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ban quản trị để được hỗ trợ.');
  }

  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    throw new ApiError(401, 'Email hoặc mật khẩu không chính xác');
  }

  const token = generateToken(user);
  const enrichedUser = await enrichUserData(user);

  return {
    token,
    user: enrichedUser,
  };
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'Không tìm thấy thông tin tài khoản');
  }

  return await enrichUserData(user);
};

export const forgotPassword = async (email) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản nào ứng với email này');
  }

  // Tạo mã OTP ngẫu nhiên 6 chữ số
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Có hiệu lực 15 phút

  user.resetPasswordOtp = otp;
  user.resetPasswordExpires = expiresAt;
  await user.save();

  return {
    message: 'Mã xác thực OTP đã được gửi thành công.',
    email: normalizedEmail,
    otpDemo: otp,
  };
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }

  if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
    throw new ApiError(400, 'Mã OTP xác thực không chính xác. Vui lòng kiểm tra lại');
  }

  if (!user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
    throw new ApiError(400, 'Mã OTP xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
  }

  // Đổi mật khẩu mới (hook pre-save sẽ tự động hash mật khẩu)
  user.password = newPassword;
  user.resetPasswordOtp = null;
  user.resetPasswordExpires = null;
  await user.save();

  return {
    message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
  };
};

export const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'Không tìm thấy thông tin tài khoản người dùng');
  }

  // Cập nhật ảnh đại diện: cho phép đối với tất cả vai trò (khách hàng, nhà hàng, tài xế)
  if (updateData.avatar !== undefined && updateData.avatar.trim()) {
    user.avatar = updateData.avatar.trim();

    // Nếu là nhà hàng, đồng bộ ảnh đại diện sang trường image của collection 'restaurants'
    if (user.role === 'restaurant_owner') {
      await Restaurant.updateOne(
        { $or: [{ owner: user._id }, { user: user._id }] },
        { $set: { image: updateData.avatar.trim() } }
      );
    }
  }

  // Riêng vai trò Khách hàng (customer): cho phép đổi thêm số điện thoại & địa chỉ nhận hàng
  if (user.role === 'customer') {
    if (updateData.phone !== undefined) {
      user.phone = updateData.phone.trim();
    }

    if (updateData.deliveryAddress !== undefined) {
      user.deliveryAddress = updateData.deliveryAddress.trim();

      if (!user.addresses || user.addresses.length === 0) {
        user.addresses = [{ street: updateData.deliveryAddress.trim(), isDefault: true }];
      } else {
        user.addresses[0].street = updateData.deliveryAddress.trim();
      }
    }

    if (updateData.fullName !== undefined && updateData.fullName.trim()) {
      user.fullName = updateData.fullName.trim();
    }
  }

  await user.save();
  return await enrichUserData(user);
};
