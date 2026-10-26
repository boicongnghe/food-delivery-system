import { Router } from 'express';
import driverRoutes from './driverRoutes.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import foodRoutes from './foodRoutes.js';
import addressRoutes from './addressRoutes.js';
import promotionRoutes from './promotionRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import restaurantRoutes from './restaurantRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import orderRoutes from './orderRoutes.js';
import adminRoutes from './adminRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import complaintRoutes from './complaintRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() },
    message: 'API is running',
  });
});

// Mounted routes
router.use('/drivers', driverRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/foods', foodRoutes);
router.use('/addresses', addressRoutes);
router.use('/promotions', promotionRoutes);
router.use('/payments', paymentRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/uploads', uploadRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/reviews', reviewRoutes);
router.use('/complaints', complaintRoutes);

export default router;
