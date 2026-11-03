import { Router } from 'express';
import * as promotionController from '../controllers/promotionController.js';

const router = Router();

// Checkout (UC14). Admins create / edit / delete codes through /api/admin/promotion-rules (UC41).
router.get('/', promotionController.getPromotionRules);
router.post('/apply', promotionController.applyPromotion);

export default router;
