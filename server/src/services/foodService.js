import mongoose from 'mongoose';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import ApiError from '../utils/ApiError.js';
import { getVoucherHighlights } from './restaurantVoucherService.js';

/**
 * Public storefront (no login). The dishes customers see and order are the restaurant's own menu
 * (menuitems, managed in UC20); the old foods collection is migrated by `npm run migrate:foods-to-menu`.
 * Only whitelisted restaurant fields leave the server: never legal documents, payout account or admin data.
 */
export const PUBLIC_RESTAURANT_FIELDS =
  'name description address location phone categories logo coverImage openingHours isAcceptingOrders rating ratingCount';

// Same case-insensitive comparison as the category unique index
const NAME_COLLATION = { locale: 'vi', strength: 2 };
const SELLABLE = { isVisible: true, isDeleted: false };

// Shown on the storefront: approved AND with an opening schedule (TO-09: no schedule = never shown)
const LISTED_RESTAURANT_FILTER = {
  status: 'approved',
  openingHours: { $elemMatch: { isOpen: { $ne: false }, 'shifts.0': { $exists: true } } },
};

const approvedRestaurantIds = () => Restaurant.find(LISTED_RESTAURANT_FILTER).distinct('_id');

// Shape kept from the old foods API so the storefront and the cart keep working
const toPublicDish = (item) => {
  const rating = typeof item.rating === 'number' && item.rating > 0 ? Number(item.rating.toFixed(1)) : 5;
  const reviewsCount = typeof item.reviewsCount === 'number' ? item.reviewsCount : 0;

  return {
    _id: item._id,
    name: item.name,
    description: item.description,
    price: item.price,
    originalPrice: item.originalPrice,
    image: item.image,
    tags: item.tags,
    category: item.category?.name || '',
    isAvailable: item.isAvailable,
    optionGroups: item.optionGroups,
    restaurant: item.restaurant,
    rating,
    reviewsCount,
  };
};

const findDishes = (filter) =>
  MenuItem.find(filter)
    .select(
      'name description price originalPrice image tags category isAvailable optionGroups restaurant sortOrder rating reviewsCount',
    )
    .populate('restaurant', PUBLIC_RESTAURANT_FIELDS)
    .populate('category', 'name')
    .sort({ restaurant: 1, sortOrder: 1, createdAt: 1 })
    .lean();

export const getFoods = async (query = {}) => {
  const approvedIds = await approvedRestaurantIds();
  const filter = { ...SELLABLE, isAvailable: true, restaurant: { $in: approvedIds } };

  if (query.search || query.keyword || query.q) {
    const term = String(query.search || query.keyword || query.q).trim();
    if (term) {
      filter.name = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
  }

  if (query.restaurantId) {
    if (!mongoose.isValidObjectId(query.restaurantId)) return [];
    filter.restaurant = { $in: approvedIds.filter((id) => String(id) === String(query.restaurantId)) };
  }
  if (query.category) {
    const categoryIds = await MenuCategory.find({ restaurant: filter.restaurant, name: String(query.category) })
      .collation(NAME_COLLATION)
      .distinct('_id');
    filter.category = { $in: categoryIds };
  }

  const dishes = await findDishes(filter);
  return dishes.map(toPublicDish);
};

export const getFoodById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }
  const [dish] = await findDishes({ _id: id, ...SELLABLE, restaurant: { $in: await approvedRestaurantIds() } });
  if (!dish) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }
  return toPublicDish(dish);
};

// Listed restaurants + the label of their best running voucher (storefront badge)
export const getRestaurants = async () => {
  const restaurants = await Restaurant.find(LISTED_RESTAURANT_FILTER).select(PUBLIC_RESTAURANT_FIELDS).lean();
  const highlights = await getVoucherHighlights(restaurants.map((restaurant) => restaurant._id));
  return restaurants.map((restaurant) => ({ ...restaurant, voucherLabel: highlights.get(String(restaurant._id)) || '' }));
};
