import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

// 1. Webhook endpoints (Public - Không dùng JWT token auth để SePay có thể gọi tới)
router.post('/sepay-webhook', paymentController.handleSepayWebhook);
router.post('/simulate-webhook', paymentController.simulateWebhook);

// 2. Protected endpoints (Yêu cầu đăng nhập JWT)
router.use(protect);
router.get('/:orderId/qr', paymentController.getPaymentQrInfo);
router.get('/:orderId/status', paymentController.checkPaymentStatus);
router.post('/:orderId', paymentController.processPayment);
router.post('/:orderId/retry', paymentController.retryPayment);
router.get('/:orderId', paymentController.getPaymentByOrder);

export default router;
