import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import * as adminUserController from '../controllers/adminUserController.js';
import * as analyticsController from '../controllers/analyticsController.js';
import * as commissionRuleController from '../controllers/commissionRuleController.js';
import * as complaintController from '../controllers/complaintController.js';
import * as deliveryIssueController from '../controllers/deliveryIssueController.js';
import * as promotionRuleController from '../controllers/promotionRuleController.js';
import * as reviewController from '../controllers/reviewController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { adminUserQuerySchema, updateUserRoleSchema, updateUserStatusSchema } from '../validations/adminUserValidation.js';
import { analyticsQuerySchema } from '../validations/analyticsValidation.js';
import { commissionRuleSchema, restaurantOptionsQuerySchema } from '../validations/commissionRuleValidation.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { adminComplaintQuerySchema, resolveComplaintSchema } from '../validations/complaintValidation.js';
import { adminDeliveryIssueQuerySchema, resolveDeliveryIssueSchema } from '../validations/deliveryIssueValidation.js';
import { promotionRuleQuerySchema, promotionRuleSchema } from '../validations/promotionRuleValidation.js';
import { adminReviewQuerySchema, reviewVisibilitySchema } from '../validations/reviewValidation.js';

const router = Router();
const validateId = validate(idParamSchema, 'params');

// Tất cả endpoint của Admin yêu cầu đăng nhập và có role là 'admin'
router.use(protect, authorize('admin'));

router.get('/pending-approvals', adminController.getPendingApprovals);
router.patch('/restaurants/:id/status', adminController.updateRestaurantStatus);
router.patch('/shippers/:id/status', adminController.updateShipperStatus);
router.get('/stats', adminController.getAdminStats);

// UC37 - Accounts
router.get('/users', validate(adminUserQuerySchema, 'query'), adminUserController.listUsers);
router.get('/users/:id', validateId, adminUserController.getUserDetail);
router.patch('/users/:id/role', validateId, validate(updateUserRoleSchema), adminUserController.updateUserRole);
router.patch('/users/:id/status', validateId, validate(updateUserStatusSchema), adminUserController.updateUserStatus);

// UC40 - Commission rules (+ restaurant picker for a rule that applies to one restaurant)
router.get('/restaurants', validate(restaurantOptionsQuerySchema, 'query'), commissionRuleController.searchRestaurants);
router.get('/commission-rules', commissionRuleController.listCommissionRules);
router.post('/commission-rules', validate(commissionRuleSchema), commissionRuleController.createCommissionRule);
router.put(
  '/commission-rules/:id',
  validateId,
  validate(commissionRuleSchema),
  commissionRuleController.updateCommissionRule,
);
router.delete('/commission-rules/:id', validateId, commissionRuleController.deleteCommissionRule);

// UC41 - Promotion rules (same PromotionRule model that checkout applies)
router.get('/promotion-rules', validate(promotionRuleQuerySchema, 'query'), promotionRuleController.listPromotionRules);
router.post('/promotion-rules', validate(promotionRuleSchema), promotionRuleController.createPromotionRule);
router.put('/promotion-rules/:id', validateId, validate(promotionRuleSchema), promotionRuleController.updatePromotionRule);
router.delete('/promotion-rules/:id', validateId, promotionRuleController.deletePromotionRule);

// UC42 - Complaints
router.get('/complaints', validate(adminComplaintQuerySchema, 'query'), complaintController.listComplaints);
router.get('/complaints/:id', validateId, complaintController.getComplaintDetail);
router.patch(
  '/complaints/:id/resolution',
  validateId,
  validate(resolveComplaintSchema),
  complaintController.resolveComplaint,
);

// UC43 - Review moderation
router.get('/reviews', validate(adminReviewQuerySchema, 'query'), reviewController.listReviews);
router.get('/reviews/:id', validateId, reviewController.getReviewDetail);
router.patch('/reviews/:id/visibility', validateId, validate(reviewVisibilitySchema), reviewController.setReviewVisibility);

// UC44 - Analytics and reports
router.get('/analytics', validate(analyticsQuerySchema, 'query'), analyticsController.getAnalytics);

// UC45 - Delivery issue reports
router.get('/delivery-issues', validate(adminDeliveryIssueQuerySchema, 'query'), deliveryIssueController.listDeliveryIssues);
router.get('/delivery-issues/:id', validateId, deliveryIssueController.getDeliveryIssueDetail);
router.patch(
  '/delivery-issues/:id/resolution',
  validateId,
  validate(resolveDeliveryIssueSchema),
  deliveryIssueController.resolveDeliveryIssue,
);

export default router;
