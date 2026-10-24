import { Router } from 'express';
import * as menuCategoryController from '../controllers/menuCategoryController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { loadOwnerRestaurant, requireEditableRestaurant } from '../middlewares/restaurantMiddleware.js';
import validate from '../middlewares/validate.js';
import { idParamSchema, menuCategorySchema } from '../validations/menuValidation.js';

// Mounted at /api/restaurants/me/menu-categories (UC20.7)
const router = Router();

router.use(protect, authorize('restaurant_owner'), loadOwnerRestaurant, requireEditableRestaurant);

router.get('/', menuCategoryController.listCategories);
router.post('/', validate(menuCategorySchema), menuCategoryController.createCategory);
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(menuCategorySchema),
  menuCategoryController.updateCategory,
);
router.delete('/:id', validate(idParamSchema, 'params'), menuCategoryController.deleteCategory);

export default router;
