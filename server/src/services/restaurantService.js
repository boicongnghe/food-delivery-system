import Restaurant from '../models/Restaurant.js';
import ApiError from '../utils/ApiError.js';
import { assertOwnUpload, deleteImageIfUnused } from './uploadService.js';
import { resolveLocationFromAddress } from '../utils/distance.js';

// The owner's screens never need the Base64 business license: leaving it out keeps every request light
// (loadOwnerRestaurant runs on each menu / order / report request)
const OWNER_FIELDS = '-businessLicense.fileData';
const IMAGE_FIELDS = ['logo', 'coverImage'];

export const getRestaurantByOwner = async (ownerId) => {
  const restaurant = await Restaurant.findOne({ owner: ownerId }).select(OWNER_FIELDS);
  if (!restaurant) {
    throw new ApiError(404, 'Bạn chưa có hồ sơ nhà hàng');
  }
  return restaurant;
};

/**
 * Create the profile on first save, update it afterwards (one restaurant per owner).
 * - expectedUpdatedAt (the version the form was loaded with): saving over a newer version is refused with 409
 *   instead of silently overwriting the changes made in another tab.
 * - A rejected profile goes back to the admin queue (pending) once the owner has fixed it.
 * - A new logo / cover must be an image this owner uploaded; the replaced one is removed when unused.
 * - A suspended restaurant cannot change its profile (same rule as the menu): the admin reopens it after
 *   checking the profile it was suspended with.
 */
const SUSPENDED_MESSAGE = 'Nhà hàng đang bị tạm ngưng hoạt động, không thể thay đổi hồ sơ. Vui lòng liên hệ quản trị viên.';

export const upsertRestaurantByOwner = async (ownerId, { expectedUpdatedAt, ...profileData }) => {
  const current = await Restaurant.findOne({ owner: ownerId }).select('logo coverImage status updatedAt').lean();
  if (current?.status === 'suspended') {
    throw new ApiError(403, SUSPENDED_MESSAGE);
  }

  for (const field of IMAGE_FIELDS) {
    if (profileData[field] && profileData[field] !== current?.[field]) {
      assertOwnUpload(profileData[field], ownerId, ['restaurants'], field);
    }
  }

  if (profileData.address && profileData.address !== current?.address) {
    profileData.location = await resolveLocationFromAddress(profileData.address);
  }

  const update = { $set: { ...profileData, ...(current?.status === 'rejected' && { status: 'pending' }) } };
  let restaurant;
  if (current) {
    const filter = {
      owner: ownerId,
      status: current.status, // an admin suspending it meanwhile wins
      ...(expectedUpdatedAt && { updatedAt: new Date(expectedUpdatedAt) }),
    };
    restaurant = await Restaurant.findOneAndUpdate(filter, update, { returnDocument: 'after', runValidators: true })
      .select(OWNER_FIELDS);
    if (!restaurant) {
      const latest = await Restaurant.findOne({ owner: ownerId }).select('status').lean();
      if (latest?.status === 'suspended') {
        throw new ApiError(403, SUSPENDED_MESSAGE);
      }
      throw new ApiError(409, 'Hồ sơ vừa được cập nhật ở nơi khác. Vui lòng tải lại trang để xem bản mới nhất.');
    }
  } else {
    // Two first saves at once: the unique index on owner rejects the second one (409 from errorHandler)
    restaurant = await Restaurant.findOneAndUpdate({ owner: ownerId }, update, {
      returnDocument: 'after',
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }).select(OWNER_FIELDS);
  }

  for (const field of IMAGE_FIELDS) {
    if (current?.[field] && current[field] !== restaurant[field]) {
      await deleteImageIfUnused(current[field]);
    }
  }
  return restaurant;
};

/**
 * Pause / resume new orders. Orders already placed are not touched: the kitchen still accepts, cooks and
 * hands them over. updatedAt is left alone on purpose, so an open profile form never gets a false 409.
 */
export const setAcceptingOrders = async (ownerId, isAcceptingOrders) => {
  const restaurant = await Restaurant.findOneAndUpdate(
    { owner: ownerId },
    { $set: { isAcceptingOrders, acceptingOrdersChangedAt: new Date() } },
    { returnDocument: 'after', runValidators: true, timestamps: false },
  ).select(OWNER_FIELDS);
  if (!restaurant) {
    throw new ApiError(404, 'Bạn chưa có hồ sơ nhà hàng');
  }
  return restaurant;
};
