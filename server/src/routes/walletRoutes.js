import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import * as walletController from '../controllers/walletController.js';

const router = Router();

// Endpoint cho khách hàng (Customer)
router.get('/my-wallet', protect, walletController.getMyWallet);
router.post('/withdraw', protect, walletController.requestWithdrawal);

// Endpoint cho quản trị viên (Admin)
router.get('/admin/withdrawals', protect, authorize('admin'), walletController.listWithdrawalsForAdmin);
router.patch('/admin/withdrawals/:id/approve', protect, authorize('admin'), walletController.approveWithdrawal);
router.patch('/admin/withdrawals/:id/reject', protect, authorize('admin'), walletController.rejectWithdrawal);

export default router;

