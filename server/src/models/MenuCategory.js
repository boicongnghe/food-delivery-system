import mongoose from 'mongoose';

const menuCategorySchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tên danh mục là bắt buộc'],
      trim: true,
      maxlength: 50,
    },
    sortOrder: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

// Category names are unique per restaurant, case-insensitive ("Phở bò" == "PHỞ BÒ").
// Protects against two concurrent requests creating the same name.
menuCategorySchema.index(
  { restaurant: 1, name: 1 },
  { name: 'restaurant_name_unique', unique: true, collation: { locale: 'vi', strength: 2 } },
);

const MenuCategory = mongoose.model('MenuCategory', menuCategorySchema);

export default MenuCategory;
