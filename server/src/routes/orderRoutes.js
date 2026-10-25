import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.post('/', orderController.createOrder);
router.get('/', orderController.getCustomerOrders);
router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', orderController.cancelOrder);
router.patch('/:id/receive', orderController.receiveOrder);
router.patch('/:id/progress', orderController.progressOrder);

export default router;
