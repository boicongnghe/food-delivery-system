import mongoose from 'mongoose';

export const MENU_ITEM_TAGS = ['best_seller', 'signature', 'spicy', 'new'];

const optionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, min: 0, default: 0 }, // extra price in VND
  },
  { _id: false },
);

// e.g. "Loại bánh phở" (required, pick 1) or "Topping" (optional, up to 4)
const optionGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isRequired: { type: Boolean, default: false },
    maxSelect: { type: Number, min: 1, default: 1 },
    options: { type: [optionSchema], default: [] },
  },
  { _id: false },
);

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuCategory',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Tên món là bắt buộc'],
      trim: true,
      maxlength: 80,
    },
    sku: { type: String, trim: true, uppercase: true, default: '' },
    description: { type: String, trim: true, maxlength: 250, default: '' },
    image: { type: String, required: [true, 'Ảnh món là bắt buộc'] },
    imagePublicId: { type: String, default: '' }, // Cloudinary ID, used to delete old images
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0, default: null },
    tags: { type: [{ type: String, enum: MENU_ITEM_TAGS }], default: [] },
    sortOrder: { type: Number, min: 1, default: 1 },
    isAvailable: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true },
    soldOutAt: { type: Date, default: null },
    optionGroups: { type: [optionGroupSchema], default: [] },
    // Soft delete: orders placed earlier may still reference this item
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// SKU is optional but must be unique among the restaurant's non-deleted items
menuItemSchema.index(
  { restaurant: 1, sku: 1 },
  {
    name: 'restaurant_sku_unique',
    unique: true,
    partialFilterExpression: { sku: { $gt: '' }, isDeleted: false },
  },
);
menuItemSchema.index({ restaurant: 1, category: 1, sortOrder: 1 });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

export default MenuItem;
