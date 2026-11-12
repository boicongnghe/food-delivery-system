import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { createOrderMessageSchema, orderChatParamsSchema } from '../validations/orderChatValidation.js';

const router = Router();

// POST /api/chat/assistant - Chat với FoodBot AI Assistant
router.post('/assistant', chatController.sendMessageToAssistant);
router.get(
  '/orders/:orderId/messages',
  protect,
  authorize('customer', 'shipper'),
  validate(orderChatParamsSchema, 'params'),
  chatController.listOrderMessages,
);
router.post(
  '/orders/:orderId/messages',
  protect,
  authorize('customer', 'shipper'),
  validate(orderChatParamsSchema, 'params'),
  validate(createOrderMessageSchema),
  chatController.sendOrderMessage,
);

export default router;
