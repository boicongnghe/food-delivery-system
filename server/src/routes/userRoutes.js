import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { deleteAccountSchema } from '../validations/authValidation.js';

const router = Router();

// GET /api/users/me - Get current user profile
router.get('/me', protect, authController.getMe);

// PUT /api/users/profile & /api/users/me - Update user profile
router.put('/profile', protect, authController.updateProfile);
router.put('/me', protect, authController.updateProfile);

// DELETE /api/users/me - Customer deletes their own account
router.delete('/me', protect, validate(deleteAccountSchema), authController.deleteAccount);

// Delivery Addresses management
router.get('/addresses', protect, authController.getAddresses);
router.post('/addresses', protect, authController.addAddress);
router.put('/addresses/:addressId', protect, authController.updateAddress);
router.delete('/addresses/:addressId', protect, authController.deleteAddress);
router.patch('/addresses/:addressId/default', protect, authController.setDefaultAddress);

export default router;
