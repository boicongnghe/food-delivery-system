import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import * as walletController from '../controllers/walletController.js';
import * as payoutAccountController from '../controllers/payoutAccountController.js';
import validate from '../middlewares/validate.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { payoutAccountSchema } from '../validations/walletValidation.js';

const router = Router();

// Endpoint cho khách hàng (Customer)
router.get('/my-wallet', protect, authorize('customer'), walletController.getMyWallet);
router.post('/withdraw', protect, authorize('customer'), walletController.requestWithdrawal);
router.post('/deposit/create', protect, authorize('customer'), walletController.createDeposit);
// The wallet is credited only by the verified bank webhook; the deposit screen polls this status
router.get('/deposit/:id', protect, authorize('customer'), validate(idParamSchema, 'params'), walletController.getDepositStatus);

// Bank accounts of customers and shippers (several, one default: withdrawals go to it). Restaurants have theirs
// under /api/restaurants/me/wallet/payout-accounts
const accountOwner = [protect, authorize('customer', 'shipper')];
const validateId = validate(idParamSchema, 'params');
router.get('/payout-accounts', ...accountOwner, payoutAccountController.listPayoutAccounts);
router.post('/payout-accounts', ...accountOwner, validate(payoutAccountSchema), payoutAccountController.addPayoutAccount);
router.patch('/payout-accounts/:id/default', ...accountOwner, validateId, payoutAccountController.setDefaultPayoutAccount);
router.delete('/payout-accounts/:id', ...accountOwner, validateId, payoutAccountController.removePayoutAccount);

// Admin review of customer withdrawals lives in adminRoutes.js (/api/admin/withdrawals)

export default router;

