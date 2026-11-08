import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { resolveRestaurant } from '../services/orderService.js';
import * as restaurantVoucherService from '../services/restaurantVoucherService.js';

// ---------- Owner: /api/restaurants/me/vouchers

export const listVouchers = asyncHandler(async (req, res) => {
  const result = await restaurantVoucherService.listVouchers(req.restaurant._id);
  res.status(200).json({ success: true, data: result, message: 'Lấy danh sách mã giảm giá thành công' });
});

export const createVoucher = asyncHandler(async (req, res) => {
  const voucher = await restaurantVoucherService.createVoucher(req.restaurant._id, req.body);
  res.status(201).json({ success: true, data: voucher, message: 'Đã tạo mã giảm giá' });
});

export const updateVoucher = asyncHandler(async (req, res) => {
  const voucher = await restaurantVoucherService.updateVoucher(req.restaurant._id, req.params.id, req.body);
  res.status(200).json({ success: true, data: voucher, message: 'Đã cập nhật mã giảm giá' });
});

export const setVoucherActive = asyncHandler(async (req, res) => {
  const voucher = await restaurantVoucherService.setVoucherActive(req.restaurant._id, req.params.id, req.body.isActive);
  res.status(200).json({
    success: true,
    data: voucher,
    message: voucher.isActive ? 'Đã chạy lại chương trình' : 'Đã tạm dừng chương trình',
  });
});

export const deleteVoucher = asyncHandler(async (req, res) => {
  await restaurantVoucherService.deleteVoucher(req.restaurant._id, req.params.id);
  res.status(200).json({ success: true, data: null, message: 'Đã xóa mã giảm giá' });
});

// ---------- Customers: /api/restaurant-vouchers (the cart may hold an id, a slug or a name)

const findRestaurant = async (identifier) => {
  const restaurant = await resolveRestaurant(identifier);
  if (!restaurant) {
    throw new ApiError(404, 'Nhà hàng không tồn tại');
  }
  return restaurant;
};

export const listRunningVouchers = asyncHandler(async (req, res) => {
  const restaurant = await findRestaurant(req.query.restaurantId);
  const vouchers = await restaurantVoucherService.listRunningVouchers(restaurant._id);
  res.status(200).json({ success: true, data: vouchers, message: 'Lấy mã giảm giá của quán thành công' });
});

export const applyVoucher = asyncHandler(async (req, res) => {
  const restaurant = await findRestaurant(req.body.restaurantId);
  const { voucher, discountAmount } = await restaurantVoucherService.resolveVoucherForOrder({
    restaurantId: restaurant._id,
    code: req.body.code,
    subtotal: req.body.subtotal,
    customerId: req.user._id,
  });
  res.status(200).json({
    success: true,
    data: { code: voucher.code, title: voucher.title, discountAmount },
    message: `Đã áp dụng mã ${voucher.code}`,
  });
});
