import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/users/me - Get current user profile
router.get('/me', protect, authController.getMe);

// PUT /api/users/profile & /api/users/me - Update user profile
router.put('/profile', protect, authController.updateProfile);
router.put('/me', protect, authController.updateProfile);

export default router;
