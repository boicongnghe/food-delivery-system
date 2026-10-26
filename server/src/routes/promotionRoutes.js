import { Router } from 'express';
import * as promotionController from '../controllers/promotionController.js';

const router = Router();

// Promotion routes (UC14)
router.get('/', promotionController.getPromotionRules);
router.post('/apply', promotionController.applyPromotion);
router.post('/', promotionController.createPromotionRule);
router.put('/:id', promotionController.updatePromotionRule);
router.delete('/:id', promotionController.deletePromotionRule);

export default router;
