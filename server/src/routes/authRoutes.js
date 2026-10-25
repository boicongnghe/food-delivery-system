import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

export default router;
