import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validations/authValidation.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', protect, authController.getMe);

export default router;
