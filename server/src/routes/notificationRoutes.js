import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

// Tất cả endpoints thông báo đều yêu cầu đăng nhập
router.use(protect);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/clear-all', notificationController.clearAll);
router.delete('/:id', notificationController.deleteNotification);

export default router;
