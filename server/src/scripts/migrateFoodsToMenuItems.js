// One-off move of the old storefront catalogue (collection foods) into the restaurants' menus (menuitems).
// Since the storefront and checkout read menuitems only (R02), a dish that exists only in foods is invisible.
// Usage (from server/):
//   npm run migrate:foods-to-menu            -> DRY RUN: only prints what would change
//   npm run migrate:foods-to-menu -- --apply -> writes the changes
// Safe to run again: foods already copied (same _id) are skipped.
//
// Rules:
// - the menu item keeps the food's _id, so carts saved in browsers before the switch still check out
// - foods.category (text) becomes a menu category of that restaurant (reused when the name already exists)
// - a restaurant that already has a dish with the same name keeps its own dish; the food is not copied
// - the foods collection is left untouched (old orders still reference it in items[].food)
import 'dotenv/config';
import mongoose from 'mongoose';
import Food from '../models/Food.js';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import { getPublicIdFromUrl } from '../utils/cloudinaryUrl.js';

const apply = process.argv.includes('--apply');
const DEFAULT_CATEGORY = 'Món chính';
// Same case-insensitive comparison as the unique indexes of the menu
const NAME_COLLATION = { locale: 'vi', strength: 2 };

const findOrCreateCategory = async (restaurantId, rawName, cache) => {
  const name = (rawName || DEFAULT_CATEGORY).trim().slice(0, 50) || DEFAULT_CATEGORY;
  const key = `${restaurantId}:${name.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);

  let category = await MenuCategory.findOne({ restaurant: restaurantId, name }).collation(NAME_COLLATION).lean();
  if (!category && apply) {
    const count = await MenuCategory.countDocuments({ restaurant: restaurantId });
    category = (await MenuCategory.create({ restaurant: restaurantId, name, sortOrder: count })).toObject();
  }
  const result = { _id: category?._id ?? new mongoose.Types.ObjectId(), name, isNew: !category };
  cache.set(key, result);
  return result;
};

const nextSortOrder = async (categoryId, cache) => {
  if (!cache.has(String(categoryId))) {
    const last = await MenuItem.findOne({ category: categoryId }).sort({ sortOrder: -1 }).select('sortOrder').lean();
    cache.set(String(categoryId), last?.sortOrder || 0);
  }
  const value = cache.get(String(categoryId)) + 1;
  cache.set(String(categoryId), value);
  return value;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`[migrate:foods-to-menu] ${apply ? 'APPLY' : 'DRY RUN'} on database "${mongoose.connection.name}"`);

  const foods = await Food.find().lean();
  const restaurantIds = new Set((await Restaurant.find().distinct('_id')).map(String));
  const categoryCache = new Map();
  const sortCache = new Map();
  const stats = { copied: 0, alreadyCopied: 0, sameNameKept: 0, noRestaurant: 0, categoriesCreated: 0 };

  for (const food of foods) {
    if (await MenuItem.exists({ _id: food._id })) {
      stats.alreadyCopied += 1;
      continue;
    }
    if (!restaurantIds.has(String(food.restaurant))) {
      stats.noRestaurant += 1;
      console.log(`  skip "${food.name}": restaurant ${food.restaurant} no longer exists`);
      continue;
    }
    const sameName = await MenuItem.exists({ restaurant: food.restaurant, name: food.name.trim(), isDeleted: false })
      .collation(NAME_COLLATION);
    if (sameName) {
      stats.sameNameKept += 1;
      console.log(`  skip "${food.name}": the restaurant already has a dish with this name`);
      continue;
    }

    const category = await findOrCreateCategory(food.restaurant, food.category, categoryCache);
    if (category.isNew) {
      stats.categoriesCreated += 1;
      category.isNew = false; // count each new category once
    }
    const now = new Date();
    const image = food.image || '';
    const menuItem = {
      _id: food._id,
      restaurant: food.restaurant,
      category: category._id,
      name: food.name.trim().slice(0, 80),
      sku: '',
      description: (food.description || '').trim().slice(0, 250),
      image,
      imagePublicId: getPublicIdFromUrl(image) || '',
      price: food.price,
      originalPrice: null,
      tags: [],
      sortOrder: await nextSortOrder(category._id, sortCache),
      isAvailable: food.isAvailable !== false,
      isVisible: true,
      soldOutAt: food.isAvailable === false ? now : null,
      optionGroups: [],
      isDeleted: false,
      deletedAt: null,
      createdAt: food.createdAt || now,
      updatedAt: now,
      __v: 0,
    };
    stats.copied += 1;
    console.log(`  copy "${menuItem.name}" -> category "${category.name}"${image ? '' : ' (no image yet)'}`);
    // Raw insert: old foods may have no image, which the menu form requires for new dishes only
    if (apply) await MenuItem.collection.insertOne(menuItem);
  }

  console.log(
    `[migrate:foods-to-menu] foods: ${foods.length} | copied: ${stats.copied} | already copied: ${stats.alreadyCopied}` +
      ` | same name kept: ${stats.sameNameKept} | restaurant missing: ${stats.noRestaurant}` +
      ` | new categories: ${stats.categoriesCreated}`,
  );
  if (!apply && stats.copied > 0) console.log('Run again with "-- --apply" to write these changes.');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('[migrate:foods-to-menu] Failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
