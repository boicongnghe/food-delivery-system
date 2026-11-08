import { Router } from 'express';
import * as restaurantController from '../controllers/restaurantController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { acceptingOrdersSchema, updateRestaurantProfileSchema } from '../validations/restaurantValidation.js';
import menuCategoryRoutes from './menuCategoryRoutes.js';
import menuItemRoutes from './menuItemRoutes.js';
import restaurantOrderRoutes from './restaurantOrderRoutes.js';
import restaurantReportRoutes from './restaurantReportRoutes.js';
import restaurantWalletRoutes from './restaurantWalletRoutes.js';

const router = Router();

// UC20 - Menu management of the owner's restaurant
router.use('/me/menu-categories', menuCategoryRoutes);
router.use('/me/menu-items', menuItemRoutes);
// Kitchen order processing: accept / reject / ready for pickup
router.use('/me/orders', restaurantOrderRoutes);
// Revenue report: overview, order history, reviews and weekly settlement
router.use('/me/reports', restaurantReportRoutes);
// Wallet: balance credited from delivered orders, withdrawals to the bank account (docs/restaurant-wallet.md)
router.use('/me/wallet', restaurantWalletRoutes);

// UC19 - Restaurant owner manages their own restaurant profile
router.get('/me', protect, authorize('restaurant_owner'), restaurantController.getMyRestaurant);
router.put(
  '/me',
  protect,
  authorize('restaurant_owner'),
  validate(updateRestaurantProfileSchema),
  restaurantController.updateMyRestaurant,
);
// Pause / resume new orders (no cook on duty, too many orders)
router.patch(
  '/me/accepting-orders',
  protect,
  authorize('restaurant_owner'),
  validate(acceptingOrdersSchema),
  restaurantController.setAcceptingOrders,
);

export default router;
