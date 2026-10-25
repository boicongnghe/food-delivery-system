import asyncHandler from '../utils/asyncHandler.js';
import * as addressService from '../services/addressService.js';

export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.getAddressesByUser(req.user._id);
  res.status(200).json({
    success: true,
    data: addresses,
    message: 'Danh sách địa chỉ giao hàng',
  });
});

export const createAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user._id, req.body);
  res.status(201).json({
    success: true,
    data: address,
    message: 'Thêm địa chỉ giao hàng thành công',
  });
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultAddress(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    data: address,
    message: 'Đã đặt làm địa chỉ mặc định',
  });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  await addressService.deleteAddress(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    data: null,
    message: 'Xóa địa chỉ thành công',
  });
});
