import { Router } from 'express';
import * as foodController from '../controllers/foodController.js';

const router = Router();

router.get('/restaurants', foodController.getRestaurants);
router.get('/', foodController.getFoods);
router.get('/:id', foodController.getFoodById);

export default router;
