import { Router } from 'express';
import * as hearingController from '../controllers/hearingController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { forCase } from '../middlewares/caseTypeMiddleware.js';
import validate from '../middlewares/validate.js';
import { HEARING_CASE_SEGMENTS } from '../models/HearingMessage.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { hearingMessageSchema, myHearingQuerySchema } from '../validations/hearingValidation.js';

// Mounted at /api/hearings - hearings seen by the parties of the order (shipper, customer, restaurant owner).
// Admin endpoints: /api/admin/delivery-issues/:id/... and /api/admin/complaints/:id/...
const router = Router();
const validateId = validate(idParamSchema, 'params');

router.use(protect, authorize('customer', 'shipper', 'restaurant_owner'));

router.get('/me', validate(myHearingQuerySchema, 'query'), hearingController.listMyHearings);
for (const [segment, caseType] of Object.entries(HEARING_CASE_SEGMENTS)) {
  const base = `/${segment}/:id`;
  router.get(base, validateId, forCase(caseType), hearingController.getHearing);
  router.get(`${base}/messages`, validateId, forCase(caseType), hearingController.listMessages);
  router.post(
    `${base}/messages`,
    validateId,
    validate(hearingMessageSchema),
    forCase(caseType),
    hearingController.sendMessage,
  );
}

export default router;
