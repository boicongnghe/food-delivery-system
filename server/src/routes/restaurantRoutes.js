import { Router } from 'express';
import * as restaurantController from '../controllers/restaurantController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { updateRestaurantProfileSchema } from '../validations/restaurantValidation.js';

const router = Router();

// UC19 - Restaurant owner manages their own restaurant profile
router.get('/me', protect, authorize('restaurant_owner'), restaurantController.getMyRestaurant);
router.put(
  '/me',
  protect,
  authorize('restaurant_owner'),
  validate(updateRestaurantProfileSchema),
  restaurantController.updateMyRestaurant,
);

export default router;
