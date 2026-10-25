import { Router } from 'express';
import driverDashboardController from '../controllers/driverDashboardController.js';
import { authorize, protect } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import {
  changeDriverPasswordSchema,
  updateDriverSettingsSchema,
} from '../validations/driverValidation.js';

const router = Router();

router.use(protect, authorize('shipper'));
router.get('/me/dashboard', driverDashboardController.getDashboard);
router.get('/me/settings', driverDashboardController.getSettings);
router.patch('/me/status', driverDashboardController.updateOnlineStatus);
router.patch(
  '/me/settings',
  validate(updateDriverSettingsSchema),
  driverDashboardController.updateSettings,
);
router.patch(
  '/me/password',
  validate(changeDriverPasswordSchema),
  driverDashboardController.changePassword,
);

export default router;
