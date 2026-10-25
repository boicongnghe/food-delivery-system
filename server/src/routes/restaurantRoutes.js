import { Router } from 'express';
import * as restaurantController from '../controllers/restaurantController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { updateRestaurantProfileSchema } from '../validations/restaurantValidation.js';
import menuCategoryRoutes from './menuCategoryRoutes.js';
import menuItemRoutes from './menuItemRoutes.js';
import restaurantOrderRoutes from './restaurantOrderRoutes.js';

const router = Router();

// UC20 - Menu management of the owner's restaurant
router.use('/me/menu-categories', menuCategoryRoutes);
router.use('/me/menu-items', menuItemRoutes);
// Kitchen order processing: accept / reject / ready for pickup
router.use('/me/orders', restaurantOrderRoutes);

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
