import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import * as walletController from '../controllers/walletController.js';
import * as payoutAccountController from '../controllers/payoutAccountController.js';
import validate from '../middlewares/validate.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { payoutAccountSchema } from '../validations/walletValidation.js';

const router = Router();

// Endpoint cho khách hàng (Customer)
router.get('/my-wallet', protect, walletController.getMyWallet);
router.post('/withdraw', protect, walletController.requestWithdrawal);
router.post('/deposit/create', protect, walletController.createDeposit);
router.post('/deposit/confirm', protect, walletController.confirmDeposit);

// Bank accounts of customers and shippers (several, one default: withdrawals go to it). Restaurants have theirs
// under /api/restaurants/me/wallet/payout-accounts
const accountOwner = [protect, authorize('customer', 'shipper')];
const validateId = validate(idParamSchema, 'params');
router.get('/payout-accounts', ...accountOwner, payoutAccountController.listPayoutAccounts);
router.post('/payout-accounts', ...accountOwner, validate(payoutAccountSchema), payoutAccountController.addPayoutAccount);
router.patch('/payout-accounts/:id/default', ...accountOwner, validateId, payoutAccountController.setDefaultPayoutAccount);
router.delete('/payout-accounts/:id', ...accountOwner, validateId, payoutAccountController.removePayoutAccount);

// Endpoint cho quản trị viên (Admin)
router.get('/admin/withdrawals', protect, authorize('admin'), walletController.listWithdrawalsForAdmin);
router.patch('/admin/withdrawals/:id/approve', protect, authorize('admin'), walletController.approveWithdrawal);
router.patch('/admin/withdrawals/:id/reject', protect, authorize('admin'), walletController.rejectWithdrawal);

export default router;

