import Address from '../models/Address.js';
import ApiError from '../utils/ApiError.js';

export const getAddressesByUser = async (userId) => {
  return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

export const createAddress = async (userId, data) => {
  const { recipientName, phone, addressLine, isDefault, note, location, latitude, longitude } = data;
  if (!recipientName || !phone || !addressLine) {
    throw new ApiError(400, 'Please provide recipient name, phone, and address line');
  }

  // If this is the first address or set as default, unset others
  const existingCount = await Address.countDocuments({ user: userId });
  const shouldBeDefault = isDefault || existingCount === 0;

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
    recipientName,
    phone,
    addressLine,
    isDefault: shouldBeDefault,
    note: note || '',
    ...(resolvedLocation ? { location: resolvedLocation } : {}),
  });

  return address;
};

export const setDefaultAddress = async (userId, addressId) => {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  await Address.updateMany({ user: userId }, { isDefault: false });
  address.isDefault = true;
  await address.save();
  return address;
};

export const deleteAddress = async (userId, addressId) => {
  const address = await Address.findOneAndDelete({ _id: addressId, user: userId });
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }
  return address;
};
