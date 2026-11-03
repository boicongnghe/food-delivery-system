import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import ApiError from '../utils/ApiError.js';

const MAX_CATEGORIES = 30;
// Case-insensitive comparison for Vietnamese names ("Phở bò" == "phở BÒ").
// Must match the collation of the unique index in MenuCategory.js
const NAME_COLLATION = { locale: 'vi', strength: 2 };

const ensureUniqueName = async (restaurantId, name, excludeId = null) => {
  const filter = { restaurant: restaurantId, name };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await MenuCategory.findOne(filter).collation(NAME_COLLATION);
  if (existing) {
    throw new ApiError(409, 'Tên danh mục đã tồn tại', [{ field: 'name', message: 'Tên danh mục đã tồn tại' }]);
  }
};

export const getCategoryOrThrow = async (restaurantId, categoryId) => {
  const category = await MenuCategory.findOne({ _id: categoryId, restaurant: restaurantId });
  if (!category) {
    throw new ApiError(404, 'Không tìm thấy danh mục');
  }
  return category;
};

// Categories with the number of dishes in each one
export const listCategories = async (restaurantId) => {
  const [categories, counts] = await Promise.all([
    MenuCategory.find({ restaurant: restaurantId }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    MenuItem.aggregate([
      { $match: { restaurant: restaurantId, isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
  const items = categories.map((category) => ({
    ...category,
    itemCount: countMap.get(String(category._id)) || 0,
  }));

  return {
    items,
    totalItems: counts.reduce((sum, item) => sum + item.count, 0),
  };
};

export const createCategory = async (restaurantId, { name, sortOrder }) => {
  const total = await MenuCategory.countDocuments({ restaurant: restaurantId });
  if (total >= MAX_CATEGORIES) {
    throw new ApiError(400, `Mỗi quán tối đa ${MAX_CATEGORIES} danh mục`);
  }
  await ensureUniqueName(restaurantId, name);

  const category = await MenuCategory.create({
    restaurant: restaurantId,
    name,
    sortOrder: sortOrder ?? total, // append to the end by default
  });

  // Two creates at once both passed the count above: the one that went over the limit is undone
  if ((await MenuCategory.countDocuments({ restaurant: restaurantId })) > MAX_CATEGORIES) {
    await MenuCategory.deleteOne({ _id: category._id });
    throw new ApiError(400, `Mỗi quán tối đa ${MAX_CATEGORIES} danh mục`);
  }
  return category;
};

export const updateCategory = async (restaurantId, categoryId, { name, sortOrder }) => {
  const category = await getCategoryOrThrow(restaurantId, categoryId);
  await ensureUniqueName(restaurantId, name, category._id);

  category.name = name;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  return category.save();
};

export const deleteCategory = async (restaurantId, categoryId) => {
  const category = await getCategoryOrThrow(restaurantId, categoryId);

  // Soft-deleted items do not block deleting the category (they only serve order history)
  const countItems = () =>
    MenuItem.countDocuments({ restaurant: restaurantId, category: category._id, isDeleted: false });
  const notEmptyError = (count) =>
    new ApiError(409, `Danh mục còn ${count} món. Hãy chuyển hoặc xóa các món trước khi xóa danh mục.`);

  const itemCount = await countItems();
  if (itemCount > 0) {
    throw notEmptyError(itemCount);
  }

  await category.deleteOne();

  // A dish may have been added or moved here between the count and the delete: put the category back
  // (same _id) so that dish never points to a missing category. Item writes re-check on their side too.
  const lateItems = await countItems();
  if (lateItems > 0) {
    await MenuCategory.collection.insertOne(category.toObject());
    throw notEmptyError(lateItems);
  }
};
