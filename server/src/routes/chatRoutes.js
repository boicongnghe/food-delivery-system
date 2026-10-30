import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';

const router = Router();

// POST /api/chat/assistant - Chat với FoodBot AI Assistant
router.post('/assistant', chatController.sendMessageToAssistant);

export default router;

