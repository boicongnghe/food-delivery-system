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

// Refund still owed to the customer (requested, or a transfer that failed and must be retried)
const OWED_REFUND_STATUSES = ['pending', 'failed'];

/** payment.* (+ refund.*) -> legacy fields. An owed refund shows as refundStatus "pending" with its amount. */
export const legacyPaymentFromCanonical = (payment, refund = null) => {
  const isOwed = payment.status !== 'refunded' && OWED_REFUND_STATUSES.includes(refund?.status);
  return {
    paymentMethod: payment.method,
    paymentStatus: toLegacyPaymentStatus(payment),
    refundStatus: payment.status === 'refunded' ? 'refunded' : isOwed ? 'pending' : 'not_applicable',
    refundAmount: isOwed ? refund.amount || 0 : payment.refundAmount || 0,
  };
};

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
