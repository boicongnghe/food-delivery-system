import { Router } from 'express';
import * as restaurantVoucherController from '../controllers/restaurantVoucherController.js';
import { protect } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { applyVoucherSchema, runningVouchersQuerySchema } from '../validations/restaurantVoucherValidation.js';

// Mounted at /api/restaurant-vouchers - restaurant vouchers seen by customers (storefront, checkout)
const router = Router();

router.get('/', validate(runningVouchersQuerySchema, 'query'), restaurantVoucherController.listRunningVouchers);
// Preview with the customer's own usage; createOrder checks everything again
router.post('/apply', protect, validate(applyVoucherSchema), restaurantVoucherController.applyVoucher);

export default router;
