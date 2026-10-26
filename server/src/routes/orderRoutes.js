import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import * as complaintController from '../controllers/complaintController.js';
import * as deliveryIssueController from '../controllers/deliveryIssueController.js';
import * as reviewController from '../controllers/reviewController.js';
import * as shipperOrderController from '../controllers/shipperOrderController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { createComplaintSchema } from '../validations/complaintValidation.js';
import { createDeliveryIssueSchema } from '../validations/deliveryIssueValidation.js';
import { paginationQuerySchema } from '../validations/orderValidation.js';
import { createReviewSchema } from '../validations/reviewValidation.js';

// Mounted at /api/orders
const router = Router();
const validateId = validate(idParamSchema, 'params');

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

// After delivery: the customer rates (UC17) or complains (UC18); the shipper reports a delivery issue (UC34)
router.post(
  '/:id/reviews',
  protect,
  authorize('customer'),
  validateId,
  validate(createReviewSchema),
  reviewController.createReview,
);
router.post(
  '/:id/complaints',
  protect,
  authorize('customer'),
  validateId,
  validate(createComplaintSchema),
  complaintController.createComplaint,
);
router.post(
  '/:id/delivery-issues',
  protect,
  authorize('shipper'),
  validateId,
  validate(createDeliveryIssueSchema),
  deliveryIssueController.createDeliveryIssue,
);

export default router;
