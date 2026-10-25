import { Router } from 'express';
import * as menuItemController from '../controllers/menuItemController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { loadOwnerRestaurant, requireEditableRestaurant } from '../middlewares/restaurantMiddleware.js';
import validate from '../middlewares/validate.js';
import {
  availabilitySchema,
  idParamSchema,
  menuItemQuerySchema,
  menuItemSchema,
  visibilitySchema,
} from '../validations/menuValidation.js';

// Mounted at /api/restaurants/me/menu-items (UC20)
const router = Router();
const validateId = validate(idParamSchema, 'params');

router.use(protect, authorize('restaurant_owner'), loadOwnerRestaurant, requireEditableRestaurant);

router.get('/', validate(menuItemQuerySchema, 'query'), menuItemController.listMenuItems);
router.post('/', validate(menuItemSchema), menuItemController.createMenuItem);
router.get('/:id', validateId, menuItemController.getMenuItem);
router.put('/:id', validateId, validate(menuItemSchema), menuItemController.updateMenuItem);
router.patch('/:id/availability', validateId, validate(availabilitySchema), menuItemController.setAvailability);
router.patch('/:id/visibility', validateId, validate(visibilitySchema), menuItemController.setVisibility);
router.delete('/:id', validateId, menuItemController.deleteMenuItem);

export default router;
