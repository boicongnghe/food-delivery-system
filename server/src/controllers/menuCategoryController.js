import asyncHandler from '../utils/asyncHandler.js';
import * as menuCategoryService from '../services/menuCategoryService.js';

export const listCategories = asyncHandler(async (req, res) => {
  const result = await menuCategoryService.listCategories(req.restaurant._id);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh mục thực đơn thành công',
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await menuCategoryService.createCategory(req.restaurant._id, req.body);

  res.status(201).json({
    success: true,
    data: category,
    message: 'Thêm danh mục thành công',
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await menuCategoryService.updateCategory(req.restaurant._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: category,
    message: 'Cập nhật danh mục thành công',
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await menuCategoryService.deleteCategory(req.restaurant._id, req.params.id);

  res.status(200).json({
    success: true,
    data: null,
    message: 'Xóa danh mục thành công',
  });
});
