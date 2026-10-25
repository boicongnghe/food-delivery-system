import asyncHandler from '../utils/asyncHandler.js';
import * as shipperOrderService from '../services/shipperOrderService.js';

export const listAvailableForPickup = asyncHandler(async (req, res) => {
  const result = await shipperOrderService.listAvailableForPickup(req.query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách đơn chờ shipper thành công',
  });
});
