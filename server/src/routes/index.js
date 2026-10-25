import { Router } from 'express';

import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import restaurantRoutes from './restaurantRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() },
    message: 'API is running',
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminRoutes);

export default router;
