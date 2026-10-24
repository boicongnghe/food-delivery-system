import asyncHandler from '../utils/asyncHandler.js';
import * as menuItemService from '../services/menuItemService.js';

export const listMenuItems = asyncHandler(async (req, res) => {
  const result = await menuItemService.listMenuItems(req.restaurant._id, req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách món thành công',
  });
});

export const getMenuItem = asyncHandler(async (req, res) => {
  const item = await menuItemService.getMenuItem(req.restaurant._id, req.params.id);

  res.status(200).json({
    success: true,
    data: item,
    message: 'Lấy thông tin món thành công',
  });
});

export const createMenuItem = asyncHandler(async (req, res) => {
  const item = await menuItemService.createMenuItem(req.restaurant._id, req.body);

  res.status(201).json({
    success: true,
    data: item,
    message: 'Thêm món ăn thành công',
  });
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await menuItemService.updateMenuItem(req.restaurant._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: item,
    message: 'Cập nhật món ăn thành công',
  });
});

export const setAvailability = asyncHandler(async (req, res) => {
  const item = await menuItemService.setAvailability(req.restaurant._id, req.params.id, req.body.isAvailable);

  res.status(200).json({
    success: true,
    data: item,
    message: item.isAvailable ? 'Đã chuyển sang Còn món' : 'Đã chuyển sang Hết món',
  });
});

export const setVisibility = asyncHandler(async (req, res) => {
  const item = await menuItemService.setVisibility(req.restaurant._id, req.params.id, req.body.isVisible);

  res.status(200).json({
    success: true,
    data: item,
    message: item.isVisible ? 'Món đã hiển thị với khách' : 'Đã ẩn món khỏi ứng dụng khách',
  });
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  await menuItemService.deleteMenuItem(req.restaurant._id, req.params.id);

  res.status(200).json({
    success: true,
    data: null,
    message: 'Xóa món ăn thành công',
  });
});
