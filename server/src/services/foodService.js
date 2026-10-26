import Food from '../models/Food.js';
import Restaurant from '../models/Restaurant.js';
import ApiError from '../utils/ApiError.js';

export const getFoods = async (query = {}) => {
  const filter = { isAvailable: true };
  if (query.restaurantId) {
    filter.restaurant = query.restaurantId;
  }
  if (query.category) {
    filter.category = query.category;
  }
  return Food.find(filter).populate('restaurant', 'name address phone rating image');
};

export const getFoodById = async (id) => {
  const food = await Food.findById(id).populate('restaurant');
  if (!food) {
    throw new ApiError(404, 'Food item not found');
  }
  return food;
};

export const getRestaurants = async () => {
  return Restaurant.find({ status: 'approved' });
};
