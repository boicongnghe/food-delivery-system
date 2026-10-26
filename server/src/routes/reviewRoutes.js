import { Router } from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { myListQuerySchema } from '../validations/reviewValidation.js';

// Mounted at /api/reviews - the customer's own reviews (UC17). Creating one: POST /api/orders/:id/reviews
const router = Router();

router.use(protect, authorize('customer'));

router.get('/me', validate(myListQuerySchema, 'query'), reviewController.listMyReviews);
router.get('/me/reviewable-orders', reviewController.listReviewableOrders);

export default router;
