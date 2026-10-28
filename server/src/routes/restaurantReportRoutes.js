import { Router } from 'express';
import * as restaurantReportController from '../controllers/restaurantReportController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { loadOwnerRestaurant } from '../middlewares/restaurantMiddleware.js';
import validate from '../middlewares/validate.js';
import {
  reportOrdersExportQuerySchema,
  reportOrdersQuerySchema,
  reportRangeQuerySchema,
  reportReviewsQuerySchema,
} from '../validations/reportValidation.js';

// Mounted at /api/restaurants/me/reports - revenue report of the owner's restaurant (read only).
// Any restaurant status may read it: a suspended restaurant still needs its settlement history.
const router = Router();

router.use(protect, authorize('restaurant_owner'), loadOwnerRestaurant);

router.get('/overview', validate(reportRangeQuerySchema, 'query'), restaurantReportController.getOverview);
router.get('/orders', validate(reportOrdersQuerySchema, 'query'), restaurantReportController.listOrders);
router.get('/orders/export', validate(reportOrdersExportQuerySchema, 'query'), restaurantReportController.exportOrders);
router.get('/reviews', validate(reportReviewsQuerySchema, 'query'), restaurantReportController.listReviews);
router.get('/settlements', validate(reportRangeQuerySchema, 'query'), restaurantReportController.getSettlements);

export default router;
