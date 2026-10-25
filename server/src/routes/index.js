import { Router } from 'express';
import authRoutes from './authRoutes.js';
import foodRoutes from './foodRoutes.js';
import addressRoutes from './addressRoutes.js';
import promotionRoutes from './promotionRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() },
    message: 'API is running',
  });
});

// Feature routes
router.use('/auth', authRoutes);
router.use('/foods', foodRoutes);
router.use('/addresses', addressRoutes);
router.use('/promotions', promotionRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);

export default router;
