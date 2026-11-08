import Address from '../models/Address.js';
import ApiError from '../utils/ApiError.js';

export const getAddressesByUser = async (userId) => {
  return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

export const createAddress = async (userId, data) => {
  const {
    title,
    recipientName,
    receiverName,
    phone,
    receiverPhone,
    addressLine,
    street,
    district,
    isDefault,
    note,
    location,
    latitude,
    longitude,
  } = data;

  const resolvedRecipientName = (recipientName || receiverName || '').trim();
  const resolvedPhone = (phone || receiverPhone || '').trim();
  const resolvedAddressLine = (
    addressLine || (street ? (district ? `${street}, ${district}` : street) : '')
  ).trim();

  if (!resolvedRecipientName || !resolvedPhone || !resolvedAddressLine) {
    throw new ApiError(400, 'Vui lòng cung cấp đầy đủ tên người nhận, số điện thoại và địa chỉ nhận hàng');
  }

  // If this is the first address or set as default, unset others
  const existingCount = await Address.countDocuments({ user: userId });
  const shouldBeDefault = Boolean(isDefault) || existingCount === 0;

  if (shouldBeDefault) {
    await Address.updateMany({ user: userId }, { isDefault: false });
  }

  let resolvedLocation = null;
  if (location && location.lat != null && location.lng != null) {
    resolvedLocation = { lat: Number(location.lat), lng: Number(location.lng) };
  } else if (latitude != null && longitude != null) {
    resolvedLocation = { lat: Number(latitude), lng: Number(longitude) };
  }

  const address = await Address.create({
    user: userId,
    title: (title || 'Nhà riêng').trim(),
    recipientName: resolvedRecipientName,
    phone: resolvedPhone,
    addressLine: resolvedAddressLine,
    isDefault: shouldBeDefault,
    note: note || '',
    ...(resolvedLocation ? { location: resolvedLocation } : {}),
  });

  return address;
};

export const updateAddress = async (userId, addressId, data) => {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw new ApiError(404, 'Không tìm thấy địa chỉ cần cập nhật');
  }

  const {
    title,
    recipientName,
    receiverName,
    phone,
    receiverPhone,
    addressLine,
    street,
    district,
    isDefault,
    note,
    location,
    latitude,
    longitude,
  } = data;

  if (title !== undefined) address.title = title.trim();
  if (recipientName || receiverName) address.recipientName = (recipientName || receiverName).trim();
  if (phone || receiverPhone) address.phone = (phone || receiverPhone).trim();
  if (addressLine || street) {
    address.addressLine = (addressLine || (district ? `${street}, ${district}` : street)).trim();
  }
  if (note !== undefined) address.note = note.trim();

  if (location && location.lat != null && location.lng != null) {
    address.location = { lat: Number(location.lat), lng: Number(location.lng) };
  } else if (latitude != null && longitude != null) {
    address.location = { lat: Number(latitude), lng: Number(longitude) };
  }

  if (isDefault) {
    await Address.updateMany({ user: userId }, { isDefault: false });
    address.isDefault = true;
  }

  await address.save();
  return address;
};

export const setDefaultAddress = async (userId, addressId) => {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw new ApiError(404, 'Không tìm thấy địa chỉ');
  }

  await Address.updateMany({ user: userId }, { isDefault: false });
  address.isDefault = true;
  await address.save();
  return address;
};

export const deleteAddress = async (userId, addressId) => {
  const address = await Address.findOneAndDelete({ _id: addressId, user: userId });
  if (!address) {
    throw new ApiError(404, 'Không tìm thấy địa chỉ');
  }
  return address;
};
