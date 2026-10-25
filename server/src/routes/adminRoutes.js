import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// Tất cả endpoint của Admin yêu cầu đăng nhập và có role là 'admin'
router.use(protect, authorize('admin'));

router.get('/pending-approvals', adminController.getPendingApprovals);
router.patch('/restaurants/:id/status', adminController.updateRestaurantStatus);
router.patch('/shippers/:id/status', adminController.updateShipperStatus);
router.get('/stats', adminController.getAdminStats);

export default router;
