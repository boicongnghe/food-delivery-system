import { Router } from 'express';
import * as walletController from '../controllers/walletController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { loadOwnerRestaurant } from '../middlewares/restaurantMiddleware.js';
import validate from '../middlewares/validate.js';
import { payoutAccountSchema, withdrawalQuerySchema, withdrawalSchema } from '../validations/walletValidation.js';

// Mounted at /api/restaurants/me/wallet - balance and withdrawals of the owner's restaurant
const router = Router();

router.use(protect, authorize('restaurant_owner'), loadOwnerRestaurant);

router.get('/', walletController.getWallet);
// The bank account that receives the withdrawals (only editable here, not in the profile)
router.put('/payout-account', validate(payoutAccountSchema), walletController.updatePayoutAccount);
router.get('/withdrawals', validate(withdrawalQuerySchema, 'query'), walletController.listWithdrawals);
router.post('/withdrawals', validate(withdrawalSchema), walletController.createWithdrawal);

export default router;
