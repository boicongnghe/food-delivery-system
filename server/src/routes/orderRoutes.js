import { Router } from 'express';
import * as shipperOrderController from '../controllers/shipperOrderController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { paginationQuerySchema } from '../validations/orderValidation.js';

// Mounted at /api/orders
const router = Router();

// Shipper: orders the kitchen finished that no shipper has taken yet
router.get(
  '/available-for-pickup',
  protect,
  authorize('shipper'),
  validate(paginationQuerySchema, 'query'),
  shipperOrderController.listAvailableForPickup,
);

export default router;
