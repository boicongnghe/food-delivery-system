import { Router } from 'express';
import * as restaurantOrderController from '../controllers/restaurantOrderController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { loadOwnerRestaurant, requireApprovedRestaurant } from '../middlewares/restaurantMiddleware.js';
import validate from '../middlewares/validate.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { orderLookupQuerySchema, rejectOrderSchema } from '../validations/orderValidation.js';

// Mounted at /api/restaurants/me/orders - kitchen order processing
// Order rules differ from menu rules (requireEditableRestaurant is NOT used here):
// - accept: approved restaurants only
// - reject / ready: any status, so orders already received can always be refunded or finished
const router = Router();
const validateId = validate(idParamSchema, 'params');

router.use(protect, authorize('restaurant_owner'), loadOwnerRestaurant);

router.get('/board', restaurantOrderController.getBoard);
router.get('/lookup', validate(orderLookupQuerySchema, 'query'), restaurantOrderController.lookupOrder);
router.get('/:id', validateId, restaurantOrderController.getOrderDetail);
router.patch('/:id/accept', validateId, requireApprovedRestaurant, restaurantOrderController.acceptOrder);
router.patch('/:id/reject', validateId, validate(rejectOrderSchema), restaurantOrderController.rejectOrder);
router.patch('/:id/ready', validateId, restaurantOrderController.markReady);

export default router;
