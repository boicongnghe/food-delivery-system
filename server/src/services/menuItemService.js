import MenuItem from '../models/MenuItem.js';
import ApiError from '../utils/ApiError.js';
import { getPublicIdFromUrl } from '../utils/cloudinaryUrl.js';
import * as menuCategoryService from './menuCategoryService.js';
import { deleteImageQuietly } from './uploadService.js';

// Soft-deleted items are never shown or edited
const NOT_DELETED = { isDeleted: false };

// Status rules: hidden items are "hidden" no matter if available or not,
// so total = selling + soldOut + hidden
const STATUS_FILTERS = {
  all: {},
  selling: { isVisible: true, isAvailable: true },
  sold_out: { isVisible: true, isAvailable: false },
  hidden: { isVisible: false },
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const countByStatus = async (match) => {
  const [result] = await MenuItem.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        all: { $sum: 1 },
        selling: {
          $sum: { $cond: [{ $and: [{ $eq: ['$isVisible', true] }, { $eq: ['$isAvailable', true] }] }, 1, 0] },
        },
        soldOut: {
          $sum: { $cond: [{ $and: [{ $eq: ['$isVisible', true] }, { $eq: ['$isAvailable', false] }] }, 1, 0] },
        },
        hidden: { $sum: { $cond: [{ $eq: ['$isVisible', false] }, 1, 0] } },
      },
    },
  ]);

  const { all = 0, selling = 0, soldOut = 0, hidden = 0 } = result || {};
  return { all, selling, soldOut, hidden };
};

const getMenuItemOrThrow = async (restaurantId, itemId) => {
  const item = await MenuItem.findOne({ _id: itemId, restaurant: restaurantId, ...NOT_DELETED });
  if (!item) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }
  return item;
};

// Friendly 409 for the normal case; the unique index (+ errorHandler code 11000) covers race conditions
const ensureUniqueSku = async (restaurantId, sku, excludeId = null) => {
  if (!sku) return;

  const filter = { restaurant: restaurantId, sku, ...NOT_DELETED };
  if (excludeId) filter._id = { $ne: excludeId };

  if (await MenuItem.exists(filter)) {
    throw new ApiError(409, 'Mã SKU đã tồn tại', [{ field: 'sku', message: `Mã SKU ${sku} đã được dùng cho món khác` }]);
  }
};

const ensureCategoryBelongsToRestaurant = async (restaurantId, categoryId) => {
  try {
    await menuCategoryService.getCategoryOrThrow(restaurantId, categoryId);
  } catch (error) {
    // Only "not found" is a client mistake; database/system errors must surface as 500
    if (error.statusCode === 404) {
      throw new ApiError(400, 'Dữ liệu không hợp lệ', [{ field: 'category', message: 'Danh mục không tồn tại' }]);
    }
    throw error;
  }
};

// Two concurrent creates may get the same number; lists use _id as the final tie-breaker
const getNextSortOrder = async (restaurantId, categoryId) => {
  const last = await MenuItem.findOne({ restaurant: restaurantId, category: categoryId, ...NOT_DELETED })
    .sort({ sortOrder: -1 })
    .select('sortOrder')
    .lean();
  return (last?.sortOrder || 0) + 1;
};

// Remove an old Cloudinary image unless another item (incl. deleted ones kept for order history) uses it
const cleanupReplacedImage = async (oldPublicId, newPublicId) => {
  if (!oldPublicId || oldPublicId === newPublicId) return;
  if (await MenuItem.exists({ imagePublicId: oldPublicId })) return;
  await deleteImageQuietly(oldPublicId);
};

export const listMenuItems = async (restaurantId, { page, limit, keyword, category, status }) => {
  // Filter without status: used for the tab counters (Tất cả / Đang bán / Hết / Đang ẩn)
  const baseFilter = { restaurant: restaurantId, ...NOT_DELETED };
  if (category && category !== 'all') {
    const categoryDoc = await menuCategoryService.getCategoryOrThrow(restaurantId, category);
    baseFilter.category = categoryDoc._id; // ObjectId, required by aggregate $match
  }
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    baseFilter.$or = [{ name: regex }, { sku: regex }];
  }

  const filter = { ...baseFilter, ...STATUS_FILTERS[status] };

  const [items, totalItems, summary, statusCounts] = await Promise.all([
    MenuItem.find(filter)
      .populate('category', 'name')
      // Group by category so "Tất cả" does not mix categories; _id keeps the order stable
      .sort({ category: 1, sortOrder: 1, createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MenuItem.countDocuments(filter),
    countByStatus({ restaurant: restaurantId, ...NOT_DELETED }), // header stats: whole restaurant
    countByStatus(baseFilter), // tab counters: current category + keyword
  ]);

  return {
    items,
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    summary,
    statusCounts,
  };
};

export const getMenuItem = async (restaurantId, itemId) => getMenuItemOrThrow(restaurantId, itemId);

export const createMenuItem = async (restaurantId, data) => {
  await ensureCategoryBelongsToRestaurant(restaurantId, data.category);
  await ensureUniqueSku(restaurantId, data.sku);

  return MenuItem.create({
    ...data,
    restaurant: restaurantId,
    imagePublicId: getPublicIdFromUrl(data.image),
    sortOrder: data.sortOrder ?? (await getNextSortOrder(restaurantId, data.category)),
    soldOutAt: data.isAvailable ? null : new Date(),
  });
};

export const updateMenuItem = async (restaurantId, itemId, data) => {
  const item = await getMenuItemOrThrow(restaurantId, itemId);
  await ensureCategoryBelongsToRestaurant(restaurantId, data.category);
  await ensureUniqueSku(restaurantId, data.sku, item._id);

  const categoryChanged = String(item.category) !== String(data.category);
  const sortOrder =
    data.sortOrder ?? (categoryChanged ? await getNextSortOrder(restaurantId, data.category) : item.sortOrder);
  const oldPublicId = item.imagePublicId;
  const newPublicId = getPublicIdFromUrl(data.image);

  const wasAvailable = item.isAvailable;
  item.set({ ...data, sortOrder, imagePublicId: newPublicId });
  if (wasAvailable !== data.isAvailable) {
    item.soldOutAt = data.isAvailable ? null : new Date();
  }

  const saved = await item.save();
  await cleanupReplacedImage(oldPublicId, newPublicId); // only after the save succeeded
  return saved;
};

// Atomic update: never overwrites concurrent edits of other fields.
// soldOutAt only changes when the status really changes (keeps the original "HẾT 11:30" time).
export const setAvailability = async (restaurantId, itemId, isAvailable) => {
  const item = await MenuItem.findOneAndUpdate(
    { _id: itemId, restaurant: restaurantId, ...NOT_DELETED },
    [
      {
        $set: {
          soldOutAt: {
            $cond: [{ $eq: ['$isAvailable', isAvailable] }, '$soldOutAt', isAvailable ? null : '$$NOW'],
          },
          isAvailable,
        },
      },
    ],
    { returnDocument: 'after', updatePipeline: true },
  ).populate('category', 'name');

  if (!item) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }
  return item;
};

export const setVisibility = async (restaurantId, itemId, isVisible) => {
  const item = await MenuItem.findOneAndUpdate(
    { _id: itemId, restaurant: restaurantId, ...NOT_DELETED },
    { $set: { isVisible } },
    { returnDocument: 'after', runValidators: true },
  ).populate('category', 'name');

  if (!item) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }
  return item;
};

// Soft delete: the item disappears from the menu but stays in the DB (and keeps its image)
// so orders placed earlier can still show it. Its SKU becomes free for new items.
export const deleteMenuItem = async (restaurantId, itemId) => {
  const item = await MenuItem.findOneAndUpdate(
    { _id: itemId, restaurant: restaurantId, ...NOT_DELETED },
    { $set: { isDeleted: true, deletedAt: new Date(), isVisible: false } },
  );

  if (!item) {
    throw new ApiError(404, 'Không tìm thấy món ăn');
  }
};
