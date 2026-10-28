/**
 * The Order model carries two sets of fields for the same facts:
 * - canonical (nested): payment.*, cancellation.*  -> read by kitchen board, shipper list, admin analytics, reports
 * - legacy (top level): paymentMethod, paymentStatus, refundStatus, refundAmount, cancelledBy, cancelReason
 *   -> written/read by checkout, payment and the customer order screens
 * These pure functions translate one side into the other. The Order model hook and the
 * migration script both use them, so the two sides can never disagree again.
 */

// Legacy payment status -> canonical. "pending"/"failed" both mean the money has not arrived.
const LEGACY_TO_CANONICAL_STATUS = {
  pending: 'unpaid',
  failed: 'unpaid',
  unpaid: 'unpaid',
  paid: 'paid',
  refunded: 'refunded',
  cancelled: 'cancelled',
};

// Canonical -> legacy. Customer screens show a refund as "paid" + refundStatus "refunded".
const toLegacyPaymentStatus = (payment) =>
  ({
    unpaid: payment.method === 'cod' ? 'unpaid' : 'pending',
    paid: 'paid',
    refunded: 'paid',
    cancelled: 'cancelled',
  })[payment.status] ?? 'pending';

/** Legacy fields -> values for payment.* (method, status, refundAmount) */
export const canonicalPaymentFromLegacy = (order) => {
  const isRefunded = order.refundStatus === 'refunded';
  return {
    method: order.paymentMethod,
    status: isRefunded ? 'refunded' : (LEGACY_TO_CANONICAL_STATUS[order.paymentStatus] ?? 'unpaid'),
    refundAmount: isRefunded ? order.refundAmount || 0 : order.payment?.refundAmount || 0,
  };
};

/** payment.* -> legacy fields */
export const legacyPaymentFromCanonical = (payment) => ({
  paymentMethod: payment.method,
  paymentStatus: toLegacyPaymentStatus(payment),
  refundStatus: payment.status === 'refunded' ? 'refunded' : 'not_applicable',
  refundAmount: payment.refundAmount || 0,
});

/** cancellation.* -> legacy fields */
export const legacyCancellationFromCanonical = (cancellation) => ({
  cancelledBy: cancellation?.by ?? null,
  cancelReason: cancellation?.by ? cancellation.note || cancellation.reason || null : null,
});

/** Legacy fields -> cancellation.* (null when the order was not cancelled) */
export const canonicalCancellationFromLegacy = (order, at = new Date()) =>
  order.cancelledBy
    ? {
        by: order.cancelledBy,
        reason: order.cancellation?.reason || '',
        note: order.cancelReason || '',
        at: order.cancellation?.at || at,
      }
    : null;
