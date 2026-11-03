import Restaurant from '../models/Restaurant.js';
import ApiError from '../utils/ApiError.js';
import { assertOwnUpload, deleteImageIfUnused } from './uploadService.js';

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
 */
export const upsertRestaurantByOwner = async (ownerId, { expectedUpdatedAt, ...profileData }) => {
  const current = await Restaurant.findOne({ owner: ownerId }).select('logo coverImage status updatedAt').lean();

  for (const field of IMAGE_FIELDS) {
    if (profileData[field] && profileData[field] !== current?.[field]) {
      assertOwnUpload(profileData[field], ownerId, ['restaurants'], field);
    }
  }

  const update = { $set: { ...profileData, ...(current?.status === 'rejected' && { status: 'pending' }) } };
  let restaurant;
  if (current) {
    const filter = { owner: ownerId, ...(expectedUpdatedAt && { updatedAt: new Date(expectedUpdatedAt) }) };
    restaurant = await Restaurant.findOneAndUpdate(filter, update, { returnDocument: 'after', runValidators: true })
      .select(OWNER_FIELDS);
    if (!restaurant) {
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
