import crypto from 'crypto';

/**
 * Bank transfer gateway ("chi hộ") behind the restaurant wallet.
 * PAYOUT_PROVIDER=demo (default): no money moves. The transfer is accepted and its result is returned at
 * once; walletService applies it through the SAME function as the webhook, so plugging a real gateway in
 * only means replacing createTransfer (accept here, result later on POST /api/webhooks/payouts).
 */
export const getPayoutMode = () => process.env.PAYOUT_PROVIDER || 'demo';

/**
 * @returns {Promise<{ providerRef: string, immediateResult: 'succeeded' | 'failed' | null }>}
 *   immediateResult null = the gateway will call the webhook later
 */
export const createTransfer = async ({ reference }) => {
  const mode = getPayoutMode();
  if (mode === 'demo') {
    return { providerRef: `DEMO-${reference}-${Date.now().toString(36).toUpperCase()}`, immediateResult: 'succeeded' };
  }
  throw new Error(`cổng chi hộ "${mode}" chưa được tích hợp`);
};

// Hex HMAC-SHA256 of the raw request body with the secret shared with the gateway (PAYOUT_WEBHOOK_SECRET)
export const signPayoutPayload = (rawBody, secret) => crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

export const isValidPayoutSignature = (rawBody, signature, secret) => {
  const expected = Buffer.from(signPayoutPayload(rawBody, secret), 'hex');
  const received = Buffer.from(String(signature || ''), 'hex');
  // Constant-time comparison: the response time never tells how much of a forged signature was right
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};
