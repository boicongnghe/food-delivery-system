import { Router } from 'express';
import driverDashboardController from '../controllers/driverDashboardController.js';
import { authorize, protect } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import {
  changeDriverPasswordSchema,
  driverPageQuerySchema,
  requestWithdrawalSchema,
  shipperApplicationSchema,
  updateDriverSettingsSchema,
} from '../validations/driverValidation.js';

const router = Router();

router.use(protect, authorize('shipper'));
router.get('/me/dashboard', driverDashboardController.getDashboard);
router.get('/me/settings', driverDashboardController.getSettings);
// Profile under review: the shipper reads the admin's reason and resubmits a rejected profile
router.get('/me/application', driverDashboardController.getApplication);
router.put('/me/application', validate(shipperApplicationSchema), driverDashboardController.resubmitApplication);
router.get('/me/withdrawals', validate(driverPageQuerySchema, 'query'), driverDashboardController.listWithdrawals);
// Delivery issue reports sent by the shipper and how they ended
router.get('/me/delivery-issues', validate(driverPageQuerySchema, 'query'), driverDashboardController.listDeliveryIssues);
router.post(
  '/me/withdrawals',
  validate(requestWithdrawalSchema),
  driverDashboardController.requestWithdrawal,
);
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
