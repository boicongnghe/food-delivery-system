import { Router } from 'express';
import * as issueHearingController from '../controllers/issueHearingController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { hearingMessageSchema, myHearingQuerySchema } from '../validations/deliveryIssueValidation.js';

// Delivery issue hearings seen by the parties of the order (UC45). Admin endpoints: /api/admin/delivery-issues
const router = Router();
const validateId = validate(idParamSchema, 'params');

router.use(protect, authorize('customer', 'shipper', 'restaurant_owner'));

router.get('/me/hearings', validate(myHearingQuerySchema, 'query'), issueHearingController.listMyHearings);
router.get('/:id', validateId, issueHearingController.getHearing);
router.get('/:id/messages', validateId, issueHearingController.listMessages);
router.post('/:id/messages', validateId, validate(hearingMessageSchema), issueHearingController.sendMessage);

export default router;
