import { Router } from 'express';
import * as restaurantVoucherController from '../controllers/restaurantVoucherController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { loadOwnerRestaurant, requireEditableRestaurant } from '../middlewares/restaurantMiddleware.js';
import validate from '../middlewares/validate.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { voucherActiveSchema, voucherSchema } from '../validations/restaurantVoucherValidation.js';

// Mounted at /api/restaurants/me/vouchers - vouchers the restaurant runs with its own money.
// A suspended restaurant can still read them but not change them (same rule as the menu).
const router = Router();

router.use(protect, authorize('restaurant_owner'), loadOwnerRestaurant, requireEditableRestaurant);

const validateId = validate(idParamSchema, 'params');

router.get('/', restaurantVoucherController.listVouchers);
router.post('/', validate(voucherSchema), restaurantVoucherController.createVoucher);
router.put('/:id', validateId, validate(voucherSchema), restaurantVoucherController.updateVoucher);
router.patch('/:id/active', validateId, validate(voucherActiveSchema), restaurantVoucherController.setVoucherActive);
router.delete('/:id', validateId, restaurantVoucherController.deleteVoucher);

export default router;
