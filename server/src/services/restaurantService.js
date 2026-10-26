import Restaurant from '../models/Restaurant.js';
import ApiError from '../utils/ApiError.js';

export const getRestaurantByOwner = async (ownerId) => {
  const restaurant = await Restaurant.findOne({ owner: ownerId });
  if (!restaurant) {
    throw new ApiError(404, 'Bạn chưa có hồ sơ nhà hàng');
  }
  return restaurant;
};

// Create the profile on first save, update it afterwards (one restaurant per owner)
export const upsertRestaurantByOwner = async (ownerId, profileData) => {
  return Restaurant.findOneAndUpdate(
    { owner: ownerId },
    { $set: profileData },
    {
      returnDocument: 'after',
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
};
