import Joi from 'joi';
import { MENU_ITEM_TAGS } from '../models/MenuItem.js';
import { cloudinaryImageUrl, objectId } from './commonValidation.js';

export const MENU_ITEM_STATUSES = ['all', 'selling', 'sold_out', 'hidden'];

// ---------- Categories ----------

export const menuCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Tên danh mục không được để trống',
    'string.max': 'Tên danh mục tối đa 50 ký tự',
    'any.required': 'Tên danh mục là bắt buộc',
  }),
  sortOrder: Joi.number().integer().min(0),
});

// ---------- Menu items ----------

const optionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(60).required().messages({
    'string.empty': 'Tên lựa chọn không được để trống',
  }),
  price: Joi.number().integer().min(0).max(1000000).default(0).messages({
    'number.min': 'Giá cộng thêm không được âm',
  }),
});

const optionGroupSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Tên nhóm tùy chọn không được để trống',
  }),
  isRequired: Joi.boolean().default(false),
  maxSelect: Joi.number().integer().min(1).required(),
  options: Joi.array().items(optionSchema).min(1).max(20).required().messages({
    'array.min': 'Mỗi nhóm tùy chọn phải có ít nhất 1 lựa chọn',
    'array.max': 'Mỗi nhóm tối đa 20 lựa chọn',
  }),
}).custom((group, helpers) => {
  if (group.maxSelect > group.options.length) {
    return helpers.message(`Nhóm "${group.name}": số lựa chọn tối đa không được lớn hơn số lựa chọn có sẵn`);
  }
  return group;
});

export const menuItemSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required().messages({
    'string.empty': 'Tên món không được để trống',
    'string.min': 'Tên món phải có ít nhất 2 ký tự',
    'string.max': 'Tên món tối đa 80 ký tự',
    'any.required': 'Tên món là bắt buộc',
  }),
  sku: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9-]{1,20}$/)
    .allow('')
    .default('')
    .messages({ 'string.pattern.base': 'Mã SKU chỉ gồm chữ, số, dấu "-" (tối đa 20 ký tự)' }),
  category: objectId.required().messages({
    'any.required': 'Vui lòng chọn danh mục',
    'string.empty': 'Vui lòng chọn danh mục',
  }),
  sortOrder: Joi.number().integer().min(1).allow(null).default(null).messages({
    'number.min': 'Thứ tự hiển thị phải từ 1 trở lên',
  }),
  price: Joi.number().integer().min(1000).max(10000000).required().messages({
    'number.base': 'Giá bán phải là số',
    'number.min': 'Giá bán tối thiểu 1.000đ',
    'number.max': 'Giá bán tối đa 10.000.000đ',
    'any.required': 'Giá bán là bắt buộc',
  }),
  originalPrice: Joi.number().integer().max(10000000).greater(Joi.ref('price')).allow(null).default(null).messages({
    'number.greater': 'Giá gốc phải lớn hơn giá bán',
  }),
  description: Joi.string().trim().max(250).allow('').default('').messages({
    'string.max': 'Mô tả tối đa 250 ký tự',
  }),
  image: cloudinaryImageUrl('Ảnh món ăn').required(),
  tags: Joi.array()
    .items(Joi.string().valid(...MENU_ITEM_TAGS))
    .unique()
    .default([])
    .messages({ 'any.only': 'Nhãn món không hợp lệ' }),
  isAvailable: Joi.boolean().default(true),
  isVisible: Joi.boolean().default(true),
  optionGroups: Joi.array().items(optionGroupSchema).max(10).default([]).messages({
    'array.max': 'Mỗi món tối đa 10 nhóm tùy chọn',
  }),
});

export const menuItemQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  keyword: Joi.string().trim().max(100).allow('').default(''),
  category: objectId.allow('', 'all').default(''),
  status: Joi.string()
    .valid(...MENU_ITEM_STATUSES)
    .default('all'),
});

export const availabilitySchema = Joi.object({
  isAvailable: Joi.boolean().required(),
});

export const visibilitySchema = Joi.object({
  isVisible: Joi.boolean().required(),
});