import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Shipper from '../models/Shipper.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import * as emailService from './emailService.js';

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

  // Tạo token kích hoạt tài khoản có hạn 24 giờ
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // 1. Lưu tài khoản người dùng vào collection 'users' với trạng thái chưa kích hoạt (isVerified: false)
  const userDataToCreate = {
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
    phone: phone ? phone.trim() : '',
    role: userRole,
    isVerified: false,
    verificationToken,
    verificationTokenExpires,
  };

  const newUser = await User.create(userDataToCreate);

  // 2. Lưu trực tiếp vào collection 'restaurants' nếu là tài khoản nhà hàng (chờ kiểm duyệt)
  if (userRole === 'restaurant_owner' && restaurantDetails) {
    await Restaurant.create({
      owner: newUser._id,
      name: (restaurantDetails.restaurantName || fullName.trim()).slice(0, 60),
      address: restaurantDetails.restaurantAddress || 'Đang cập nhật địa chỉ',
      phone: (phone ? phone.trim() : '0900000000'),
      description: (restaurantDetails.businessItems || '').slice(0, 150),
      ownerCitizenId: restaurantDetails.ownerCitizenId || '',
      businessLicense: restaurantDetails.businessLicense || null,
      status: 'pending',
    });
  }

  // 3. Lưu trực tiếp vào collection 'shippers' nếu là tài khoản shipper (chờ kiểm duyệt)
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
      status: 'pending',
    });
  }

  // 4. Gửi email xác thực tài khoản kèm liên kết kích hoạt
  const emailResult = await emailService.sendVerificationEmail({
    email: normalizedEmail,
    fullName: newUser.fullName,
    token: verificationToken,
  });

  return {
    requiresVerification: true,
    email: normalizedEmail,
    fullName: newUser.fullName,
    message: 'Đăng ký tài khoản thành công! Chúng tôi đã gửi email xác nhận. Vui lòng kiểm tra hòm thư để kích hoạt tài khoản.',
    verificationUrl: emailResult?.verificationUrl,
    isDevMode: emailResult?.isDevMode,
  };
};

export const verifyEmail = async (token) => {
  if (!token) {
    throw new ApiError(400, 'Mã token xác thực không hợp lệ');
  }

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() },
  }).select('+verificationToken +verificationTokenExpires');

  if (!user) {
    // Kiểm tra xem có phải tài khoản đã được kích hoạt trước đó hay không
    throw new ApiError(
      400,
      'Liên kết xác nhận không hợp lệ hoặc đã hết hạn (24 giờ). Vui lòng yêu cầu gửi lại email kích hoạt mới.'
    );
  }

  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  await user.save();

  const authToken = generateToken(user);
  const enrichedUser = await enrichUserData(user);

  return {
    message: 'Kích hoạt tài khoản thành công! Chào mừng bạn đến với hệ thống FoodDelivery.',
    token: authToken,
    user: enrichedUser,
  };
};

export const resendVerificationEmail = async (email) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+verificationToken +verificationTokenExpires'
  );

  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản nào khớp với địa chỉ email này.');
  }

  if (user.isVerified) {
    return {
      alreadyVerified: true,
      message: 'Tài khoản này đã được kích hoạt trước đó. Bạn có thể đăng nhập ngay.',
    };
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  user.verificationToken = verificationToken;
  user.verificationTokenExpires = verificationTokenExpires;
  await user.save();

  const emailResult = await emailService.sendVerificationEmail({
    email: normalizedEmail,
    fullName: user.fullName,
    token: verificationToken,
  });

  return {
    message: 'Đã gửi lại email kích hoạt thành công. Vui lòng kiểm tra hộp thư của bạn.',
    email: normalizedEmail,
    verificationUrl: emailResult?.verificationUrl,
    isDevMode: emailResult?.isDevMode,
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

  // Danh sách email demo luôn được miễn kiểm tra xác thực
  const demoEmails = [
    'khachhang@fooddelivery.vn',
    'chuquan@fooddelivery.vn',
    'taixe@fooddelivery.vn',
    'admin@fooddelivery.vn',
  ];

  if (user.isVerified === false && !demoEmails.includes(normalizedEmail)) {
    const error = new ApiError(
      403,
      'Tài khoản của bạn chưa được kích hoạt qua email. Vui lòng kiểm tra hộp thư của bạn để kích hoạt hoặc yêu cầu gửi lại link kích hoạt.'
    );
    error.requiresVerification = true;
    error.unverifiedEmail = user.email;
    throw error;
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

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy thông tin tài khoản người dùng');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại');
  }

  user.password = newPassword;
  await user.save();

  return {
    message: 'Đổi mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo.',
  };
};

export const getUserAddresses = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
  return user.addresses || [];
};

export const addUserAddress = async (userId, addressData) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');

  const shouldBeDefault = Boolean(addressData.isDefault) || !user.addresses || user.addresses.length === 0;

  if (shouldBeDefault && user.addresses) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  const newAddress = {
    title: (addressData.title || 'Nhà riêng').trim(),
    receiverName: (addressData.receiverName || user.fullName).trim(),
    receiverPhone: (addressData.receiverPhone || user.phone).trim(),
    street: (addressData.street || '').trim(),
    ward: (addressData.ward || '').trim(),
    district: (addressData.district || '').trim(),
    city: (addressData.city || 'TP.HCM').trim(),
    isDefault: shouldBeDefault,
  };

  user.addresses.push(newAddress);

  if (shouldBeDefault) {
    user.deliveryAddress = newAddress.street;
  }

  await user.save();
  return user.addresses;
};

export const updateUserAddress = async (userId, addressId, addressData) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');

  const address = user.addresses.id(addressId);
  if (!address) throw new ApiError(404, 'Không tìm thấy địa chỉ cần cập nhật');

  if (addressData.isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
    address.isDefault = true;
    user.deliveryAddress = addressData.street || address.street;
  }

  if (addressData.title !== undefined) address.title = addressData.title.trim();
  if (addressData.receiverName !== undefined) address.receiverName = addressData.receiverName.trim();
  if (addressData.receiverPhone !== undefined) address.receiverPhone = addressData.receiverPhone.trim();
  if (addressData.street !== undefined) address.street = addressData.street.trim();
  if (addressData.ward !== undefined) address.ward = addressData.ward.trim();
  if (addressData.district !== undefined) address.district = addressData.district.trim();
  if (addressData.city !== undefined) address.city = addressData.city.trim();

  await user.save();
  return user.addresses;
};

export const deleteUserAddress = async (userId, addressId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');

  const addrToDelete = user.addresses.id(addressId);
  if (!addrToDelete) throw new ApiError(404, 'Không tìm thấy địa chỉ');

  const wasDefault = addrToDelete.isDefault;
  user.addresses.pull({ _id: addressId });

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
    user.deliveryAddress = user.addresses[0].street;
  } else if (user.addresses.length === 0) {
    user.deliveryAddress = '';
  }

  await user.save();
  return user.addresses;
};

export const setDefaultUserAddress = async (userId, addressId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');

  const targetAddr = user.addresses.id(addressId);
  if (!targetAddr) throw new ApiError(404, 'Không tìm thấy địa chỉ');

  user.addresses.forEach((addr) => {
    addr.isDefault = addr._id.toString() === addressId.toString();
  });

  user.deliveryAddress = targetAddr.street;

  await user.save();
  return user.addresses;
};

// Aliases for compatibility
export const login = async (email, password) => loginUser({ email, password });
export const getMe = async (userId) => getCurrentUser(userId);

/**
 * Đăng nhập / Đăng ký bằng tài khoản Google (hỗ trợ cả idToken và accessToken)
 */
export const loginWithGoogle = async ({ idToken, accessToken }) => {
  let payload = null;

  if (idToken) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } else if (accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new ApiError(401, 'Không thể lấy thông tin người dùng từ Google Access Token');
    }
    payload = await response.json();
  } else {
    throw new ApiError(400, 'Thiếu thông tin xác thực Google (cần idToken hoặc accessToken)');
  }

  if (!payload || !payload.email) {
    throw new ApiError(400, 'Không lấy được thông tin email từ tài khoản Google.');
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  let user = await User.findOne({
    $or: [{ email: normalizedEmail }, { googleId: payload.sub }],
  });

  if (user) {
    if (!user.isActive) {
      throw new ApiError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ban quản trị để được hỗ trợ.');
    }

    let changed = false;
    if (!user.googleId) {
      user.googleId = payload.sub;
      changed = true;
    }
    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpires = null;
      changed = true;
    }
    if ((!user.avatar || user.avatar.includes('unsplash.com')) && payload.picture) {
      user.avatar = payload.picture;
      changed = true;
    }
    if (changed) {
      await user.save();
    }
  } else {
    // Tạo tài khoản khách hàng mới cho người dùng Google
    user = await User.create({
      fullName: payload.name || 'Khách hàng Google',
      email: normalizedEmail,
      googleId: payload.sub,
      avatar: payload.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      role: 'customer',
      authProvider: 'google',
      isVerified: true,
      phone: '',
    });
  }

  const token = generateToken(user);
  const enrichedUser = await enrichUserData(user);

  return {
    message: 'Đăng nhập bằng tài khoản Google thành công! 🎉',
    token,
    user: enrichedUser,
  };
};

/**
 * Đăng nhập / Đăng ký bằng tài khoản Facebook
 */
export const loginWithFacebook = async ({ accessToken, userID }) => {
  if (!accessToken) {
    throw new ApiError(400, 'Thiếu Facebook Access Token');
  }

  // Gọi Graph API của Facebook để xác thực token và lấy thông tin cơ bản (ID, Tên, Avatar)
  const fbRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,picture.type(large)&access_token=${accessToken}`
  );

  if (!fbRes.ok) {
    const errorData = await fbRes.json().catch(() => ({}));
    throw new ApiError(401, errorData?.error?.message || 'Không thể xác thực Facebook Access Token');
  }

  const fbData = await fbRes.json();
  const facebookId = fbData.id || userID;
  const fullName = fbData.name || 'Người dùng Facebook';
  const avatar =
    fbData.picture?.data?.url ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

  // Định danh tài khoản Facebook độc lập theo facebookId
  const email = fbData.email
    ? fbData.email.trim().toLowerCase()
    : `fb_${facebookId}@fooddelivery.vn`;

  let user = await User.findOne({
    $or: [{ facebookId }, { email }],
  });

  if (user) {
    if (!user.isActive) {
      throw new ApiError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ban quản trị để được hỗ trợ.');
    }

    let changed = false;
    if (!user.facebookId) {
      user.facebookId = facebookId;
      changed = true;
    }
    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpires = null;
      changed = true;
    }
    if ((!user.avatar || user.avatar.includes('unsplash.com')) && avatar) {
      user.avatar = avatar;
      changed = true;
    }
    if (changed) {
      await user.save();
    }
  } else {
    user = await User.create({
      fullName,
      email,
      facebookId,
      avatar,
      role: 'customer',
      authProvider: 'facebook',
      isVerified: true,
      phone: '',
    });
  }

  const token = generateToken(user);
  const enrichedUser = await enrichUserData(user);

  return {
    message: 'Đăng nhập bằng tài khoản Facebook thành công! 🎉',
    token,
    user: enrichedUser,
  };
};

export const deleteCustomerAccount = async (userId, { password, confirmationText } = {}) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy thông tin tài khoản người dùng.');
  }

  // 1. Chỉ cho phép vai trò 'customer' tự xóa tài khoản
  if (user.role !== 'customer') {
    throw new ApiError(
      403,
      'Chức năng tự xóa tài khoản hiện tại chỉ áp dụng cho tài khoản Khách hàng. Đối tác Quán ăn hoặc Tài xế vui lòng liên hệ Ban Quản trị để đối soát tài chính và giải quyết hợp đồng.'
    );
  }

  // 2. Bảo vệ tài khoản demo mẫu của hệ thống
  const demoEmails = [
    'khachhang@fooddelivery.vn',
    'chuquan@fooddelivery.vn',
    'taixe@fooddelivery.vn',
    'admin@fooddelivery.vn',
  ];
  if (demoEmails.includes(user.email)) {
    throw new ApiError(
      403,
      'Đây là tài khoản mẫu thử nghiệm của hệ thống, không thể xóa. Bạn có thể đăng ký một tài khoản mới để thử nghiệm tính năng xóa tài khoản.'
    );
  }

  // 3. Không cho phép xóa nếu đang có đơn hàng chưa hoàn tất hoặc đang giao
  const activeOrder = await Order.findOne({
    customer: user._id,
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'delivering'] },
  });

  if (activeOrder) {
    const orderRef = activeOrder.orderCode || activeOrder.orderNumber || 'đang xử lý';
    throw new ApiError(
      400,
      `Không thể xóa tài khoản khi đang có đơn hàng (${orderRef}) chưa hoàn tất hoặc đang giao. Vui lòng đợi nhận hàng hoặc hủy đơn trước khi xóa.`
    );
  }

  // 4. Xác thực bảo mật:
  // Nếu tài khoản có mật khẩu: Bắt buộc kiểm tra mật khẩu hiện tại
  if (user.password) {
    if (!password) {
      throw new ApiError(400, 'Vui lòng nhập mật khẩu hiện tại để xác nhận xóa tài khoản.');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(400, 'Mật khẩu xác nhận không chính xác.');
    }
  } else {
    // Tài khoản mạng xã hội (Google / Facebook) không có mật khẩu: Bắt buộc nhập cụm từ xác nhận
    const normalizedConfirmation = (confirmationText || '').trim().toUpperCase();
    if (normalizedConfirmation !== 'XÓA TÀI KHOẢN') {
      throw new ApiError(400, 'Vui lòng nhập chính xác cụm từ "XÓA TÀI KHOẢN" để xác nhận.');
    }
  }

  // 5. Xóa thông báo liên quan của khách hàng
  await Notification.deleteMany({ recipient: user._id });

  // 6. Xóa vĩnh viễn tài khoản người dùng khỏi hệ thống
  await User.findByIdAndDelete(user._id);

  return {
    success: true,
    message: 'Tài khoản của bạn đã được xóa vĩnh viễn khỏi hệ thống.',
  };
};
