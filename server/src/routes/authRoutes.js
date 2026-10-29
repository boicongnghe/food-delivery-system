import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { loginRateLimit, forgotPasswordRateLimit, resendVerificationRateLimit } from '../middlewares/rateLimitMiddleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../validations/authValidation.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', resendVerificationRateLimit, validate(resendVerificationSchema), authController.resendVerification);
router.post('/login', loginRateLimit, validate(loginSchema), authController.login);
router.post('/google', loginRateLimit, authController.googleLogin);
router.post('/facebook', loginRateLimit, authController.facebookLogin);
router.post('/forgot-password', forgotPasswordRateLimit, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.put('/change-password', protect, validate(changePasswordSchema), authController.changePassword);
router.get('/me', protect, authController.getMe);

export default router;
