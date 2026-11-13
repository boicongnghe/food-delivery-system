import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

// 1. Webhook SePay (Public - Không dùng JWT token auth để SePay có thể gọi tới, xác thực bằng header SEPAY_API_KEY trong service)
router.post('/sepay-webhook', paymentController.handleSepayWebhook);

// 2. Protected endpoints (Yêu cầu đăng nhập JWT)
router.use(protect);
// Dev / demo only (ENABLE_PAYMENT_SIMULATION=true, never in production): the caller's own order or deposit
router.post('/simulate-webhook', paymentController.simulateWebhook);
router.get('/:orderId/qr', paymentController.getPaymentQrInfo);
router.get('/:orderId/status', paymentController.checkPaymentStatus);
router.get('/:orderId', paymentController.getPaymentByOrder);

export default router;
