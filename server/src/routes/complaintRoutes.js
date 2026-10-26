import { Router } from 'express';
import * as complaintController from '../controllers/complaintController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { myListQuerySchema } from '../validations/reviewValidation.js';

// Mounted at /api/complaints - the customer's own complaints (UC18). Creating one: POST /api/orders/:id/complaints
const router = Router();

router.use(protect, authorize('customer'));

router.get('/me', validate(myListQuerySchema, 'query'), complaintController.listMyComplaints);
router.get('/me/eligible-orders', complaintController.listComplainableOrders);

export default router;
