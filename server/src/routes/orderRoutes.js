import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import * as shipperOrderController from '../controllers/shipperOrderController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { paginationQuerySchema } from '../validations/orderValidation.js';

// Mounted at /api/orders
const router = Router();

// Shipper endpoint: orders the kitchen finished that no shipper has taken yet
router.get(
  '/available-for-pickup',
  protect,
  authorize('shipper'),
  validate(paginationQuerySchema, 'query'),
  shipperOrderController.listAvailableForPickup,
);

// Customer / General Order endpoints
router.post('/', protect, orderController.createOrder);
router.get('/', protect, orderController.getCustomerOrders);
router.get('/:id', protect, orderController.getOrderById);
router.post('/:id/cancel', protect, orderController.cancelOrder);
router.patch('/:id/receive', protect, orderController.receiveOrder);
router.patch('/:id/progress', protect, orderController.progressOrder);

export default router;
