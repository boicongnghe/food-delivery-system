import { Router } from 'express';
import * as webhookController from '../controllers/webhookController.js';
import { verifyPayoutSignature } from '../middlewares/verifyPayoutSignature.js';
import validate from '../middlewares/validate.js';
import { payoutWebhookSchema } from '../validations/walletValidation.js';

// Mounted at /api/webhooks - callbacks from external services, authenticated by signature (no JWT)
const router = Router();

router.post('/payouts', verifyPayoutSignature, validate(payoutWebhookSchema), webhookController.handlePayoutWebhook);

export default router;
