import { Router } from 'express';
import * as walletController from '../controllers/walletController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { loadOwnerRestaurant } from '../middlewares/restaurantMiddleware.js';
import validate from '../middlewares/validate.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { payoutAccountSchema, withdrawalQuerySchema, withdrawalSchema } from '../validations/walletValidation.js';

// Mounted at /api/restaurants/me/wallet - balance and withdrawals of the owner's restaurant
const router = Router();

router.use(protect, authorize('restaurant_owner'), loadOwnerRestaurant);

router.get('/', walletController.getWallet);
// Bank accounts that receive the withdrawals (only editable here, not in the profile): several, one default
const validateId = validate(idParamSchema, 'params');
router.post('/payout-accounts', validate(payoutAccountSchema), walletController.addPayoutAccount);
router.patch('/payout-accounts/:id/default', validateId, walletController.setDefaultPayoutAccount);
router.delete('/payout-accounts/:id', validateId, walletController.removePayoutAccount);
router.get('/withdrawals', validate(withdrawalQuerySchema, 'query'), walletController.listWithdrawals);
router.post('/withdrawals', validate(withdrawalSchema), walletController.createWithdrawal);

export default router;
