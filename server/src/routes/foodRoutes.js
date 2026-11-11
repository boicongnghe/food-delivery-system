import { Router } from 'express';
import * as foodController from '../controllers/foodController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { dishReviewSchema, foodReviewsQuerySchema } from '../validations/reviewValidation.js';

const router = Router();
const validateId = validate(idParamSchema, 'params');

router.get('/restaurants', foodController.getRestaurants);
router.get('/', foodController.getFoods);
router.get('/:id', validateId, foodController.getFoodById);

// Dish reviews (Shopee style verified buyer reviews)
router.get('/:id/reviews', validateId, validate(foodReviewsQuerySchema, 'query'), foodController.getFoodReviews);
router.get('/:id/my-review-status', validateId, protect, authorize('customer'), foodController.getMyDishReviewStatus);
router.post('/:id/reviews', validateId, protect, authorize('customer'), validate(dishReviewSchema), foodController.createDishReview);

export default router;
