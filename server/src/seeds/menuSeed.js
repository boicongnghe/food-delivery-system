// Seed sample menu for one restaurant owner (demo/testing only).
// Usage: npm run seed:menu [owner-email]   (default: chuquan@fooddelivery.vn)
// WARNING: replaces all menu categories and items of that restaurant.
// Needs CLOUDINARY_URL: sample photos are copied to Cloudinary because the API only accepts our own images.
import 'dotenv/config';
import mongoose from 'mongoose';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import { ROOT_FOLDER } from '../utils/cloudinaryUrl.js';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';

const ownerEmail = process.argv[2] || 'chuquan@fooddelivery.vn';

// Source photos (Unsplash) - uploaded once per owner with a fixed public ID, re-runs overwrite them
const SOURCE_IMAGES = {
  pho: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=700&q=80',
  bowl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80',
  side: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=700&q=80',
  drink: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=80',
  combo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
};

const PHO_OPTIONS = [
  {
    name: 'Loại bánh phở',
    isRequired: true,
    maxSelect: 1,
    options: [
      { name: 'Bánh phở truyền thống (bản vừa)', price: 0 },
      { name: 'Bánh phở tươi sợi nhỏ mềm', price: 0 },
      { name: 'Đổi sang bánh mì giòn (2 ổ)', price: 5000 },
    ],
  },
  {
    name: 'Topping thêm & ăn kèm',
    isRequired: false,
    maxSelect: 4,
    options: [
      { name: 'Thêm trứng gà ta chần nước béo', price: 10000 },
      { name: 'Quẩy giòn đặc biệt (3 chiếc)', price: 10000 },
      { name: 'Thêm gầu giòn hảo hạng (50g)', price: 25000 },
      { name: 'Thêm tiết luộc hành hoa', price: 8000 },
    ],
  },
];

const MENU = [
  {
    category: 'Phở Bò Bán Chạy',
    items: [
      { name: 'Phở Bò Tái Lăn Hà Nội', sku: 'PB-01', price: 65000, originalPrice: 75000, description: 'Bò xào lăn tỏi gừng', tags: ['best_seller'], image: 'pho', optionGroups: PHO_OPTIONS },
      { name: 'Phở Bò Tái Nạm Gầu Giòn', sku: 'PB-02', price: 60000, description: 'Gầu giòn, nạm mềm', image: 'pho', optionGroups: PHO_OPTIONS },
      { name: 'Phở Đặc Biệt Thập Cẩm Bếp & Phố', sku: 'PB-03', price: 85000, description: 'Tái, nạm, gầu, gân, bò viên', tags: ['signature'], image: 'pho', optionGroups: PHO_OPTIONS },
      { name: 'Phở Gầu Giòn Hảo Hạng', sku: 'PB-04', price: 70000, description: 'Gầu chọn lọc giòn sần sật', image: 'pho', isAvailable: false },
      { name: 'Phở Bò Sốt Vang Bánh Mì', sku: 'PB-05', price: 68000, description: 'Rượu vang hoa hồi', image: 'bowl', isVisible: false },
    ],
  },
  {
    category: 'Phở Gà & Món Nước',
    items: [
      { name: 'Phở Gà Ta Xé Phay', sku: 'PG-01', price: 55000, description: 'Gà ta thả vườn, nước dùng thanh', image: 'bowl' },
      { name: 'Bún Thang Hà Nội', sku: 'PG-02', price: 60000, description: 'Trứng tráng, giò lụa, gà xé', tags: ['new'], image: 'bowl' },
    ],
  },
  {
    category: 'Món Ăn Kèm & Quẩy',
    items: [
      { name: 'Quẩy Giòn Béo Vàng (5 chiếc)', sku: 'AK-01', price: 15000, description: 'Chiên mới giòn tan', image: 'side' },
      { name: 'Trứng Gà Ta Chần Nước Béo', sku: 'AK-02', price: 10000, description: 'Trứng lòng đào kèm hành', image: 'side' },
    ],
  },
  { category: 'Topping Bò & Trứng', items: [] },
  {
    category: 'Đồ Uống Giải Khát',
    items: [
      { name: 'Trà Đá Chanh Sả', sku: 'DU-01', price: 15000, description: 'Mát lạnh, thơm sả', image: 'drink' },
      { name: 'Sấu Ngâm Đá', sku: 'DU-02', price: 20000, description: 'Sấu Hà Nội chua ngọt', tags: ['spicy'], image: 'drink', isAvailable: false },
    ],
  },
  {
    category: 'Combo Tiết Kiệm',
    items: [
      { name: 'Combo Phở Bò + Quẩy + Trà Đá', sku: 'CB-01', price: 85000, originalPrice: 95000, description: 'No căng bụng, tiết kiệm 10k', image: 'combo' },
    ],
  },
];

const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
  dayOfWeek,
  isOpen: true,
  shifts: [{ open: '06:00', close: '22:00' }],
}));

// Copy the sample photos into food-delivery/menu-items/<ownerId>/seed-<key> (same layout as real uploads)
const uploadSeedImages = async (ownerId) => {
  const images = {};
  for (const [key, sourceUrl] of Object.entries(SOURCE_IMAGES)) {
    const result = await cloudinary.uploader.upload(sourceUrl, {
      public_id: `${ROOT_FOLDER}/menu-items/${ownerId}/seed-${key}`,
      overwrite: true,
      resource_type: 'image',
    });
    images[key] = { image: result.secure_url, imagePublicId: result.public_id };
  }
  return images;
};

const run = async () => {
  if (!isCloudinaryConfigured()) {
    throw new Error('CLOUDINARY_URL is missing in server/.env');
  }
  await mongoose.connect(process.env.MONGO_URI);
  // Apply index changes (e.g. soft-delete aware SKU index, unique category names)
  await Promise.all([MenuItem.syncIndexes(), MenuCategory.syncIndexes()]);

  const owner = await User.findOne({ email: ownerEmail, role: 'restaurant_owner' });
  if (!owner) {
    throw new Error(`Restaurant owner ${ownerEmail} not found. Run "node src/seed.js" or register first.`);
  }

  let restaurant = await Restaurant.findOne({ owner: owner._id });
  if (!restaurant) {
    restaurant = await Restaurant.create({
      owner: owner._id,
      name: 'Phở Bò Gia Truyền 1986',
      description: 'Hương vị phở bò nước dùng hầm xương gia truyền 40 năm tại phố cổ Hà Nội.',
      address: '48 Hàng Đồng, P. Hàng Bồ, Q. Hoàn Kiếm, Hà Nội',
      phone: '0912345678',
      categories: ['Phở & Bún', 'Ăn sáng'],
      openingHours: DEFAULT_HOURS,
    });
    console.log(`Created restaurant profile: ${restaurant.name}`);
  }

  const images = await uploadSeedImages(owner._id);

  await MenuItem.deleteMany({ restaurant: restaurant._id });
  await MenuCategory.deleteMany({ restaurant: restaurant._id });

  let itemCount = 0;
  for (const [index, group] of MENU.entries()) {
    const category = await MenuCategory.create({ restaurant: restaurant._id, name: group.category, sortOrder: index });

    for (const [position, item] of group.items.entries()) {
      const isAvailable = item.isAvailable ?? true;
      await MenuItem.create({
        ...item,
        ...images[item.image],
        restaurant: restaurant._id,
        category: category._id,
        sortOrder: position + 1,
        isAvailable,
        soldOutAt: isAvailable ? null : new Date(),
      });
      itemCount += 1;
    }
  }

  console.log(`Seeded ${MENU.length} categories and ${itemCount} menu items for ${ownerEmail}`);
};

run()
  .catch((error) => {
    console.error(`Menu seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
