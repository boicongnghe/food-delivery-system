import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() },
    message: 'API is running',
  });
});

// Mount feature routers here, e.g. router.use('/auth', authRoutes);

export default router;
