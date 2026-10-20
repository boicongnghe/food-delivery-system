import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/users/me - Get current user profile
router.get('/me', protect, authController.getMe);

export default router;
