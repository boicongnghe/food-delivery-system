import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import PromotionRule from '../models/PromotionRule.js';
import { legacyCancellationFromCanonical, legacyPaymentFromCanonical } from '../utils/orderFieldSync.js';
import { recordStatusChange } from './orderHistoryService.js';
import { refundRequestFields } from './orderPolicy.js';
import { creditWalletRefund } from './walletService.js';

/**
 * Cancel an order on behalf of the platform: timeout rules (TO-03, TO-07) and the admin (TO-05).
 * Conditional on the status and payment already read (+ extraFilter), so it never cancels an order that
 * moved on meanwhile (e.g. the kitchen accepted it a second ago). A paid order gets a refund request,
 * completed later by an admin (R06); an unpaid one has nothing to give back.
 * @param {object} order - lean order with _id, status, payment, total / totalPrice
 * @returns {Promise<{ order: object, isPaid: boolean, amount: number } | null>} null when it lost the race
 */
export const cancelOrderBySystem = async (order, { reason, note, action, extraFilter = {} }) => {
  const now = new Date();
  const amount = order.total || order.totalPrice || 0;
  const paymentStatus = order.payment?.status;
  const isPaid = paymentStatus === 'paid';
  const cancellation = { by: 'system', reason, note, at: now };
  const paymentUpdate = isPaid ? refundRequestFields(amount, now) : { 'payment.status': 'cancelled' };
  // findOneAndUpdate skips the model hook: write the legacy fields of the customer screens too
  const legacyUpdate = {
    ...legacyPaymentFromCanonical(
      { method: order.payment?.method || order.paymentMethod || 'cod', status: isPaid ? 'refunded' : 'cancelled', refundAmount: isPaid ? amount : 0 },
      isPaid ? { status: 'succeeded', amount } : null,
    ),
    ...legacyCancellationFromCanonical(cancellation),
  };

  const matchFilter = { _id: order._id, status: order.status, ...extraFilter };
  if (paymentStatus) {
    matchFilter['payment.status'] = paymentStatus;
  }

  const cancelled = await Order.findOneAndUpdate(
    matchFilter,
    {
      $set: { status: 'cancelled', cancellation, ...paymentUpdate, ...legacyUpdate },
      $push: { statusHistory: { status: 'cancelled', at: now, byRole: 'system' } },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (!cancelled) return null;

  if (isPaid && cancelled.customer) {
    await creditWalletRefund({
      userId: cancelled.customer,
      orderId: cancelled._id,
      orderCode: cancelled.orderCode || cancelled.orderNumber,
      amount,
    });
    await Payment.updateMany({ order: cancelled._id, status: 'success' }, { $set: { status: 'refunded' } });
  }

  // Rollback promo usage count if order had a platform promotion
  if (cancelled.promotion?.code) {
    await PromotionRule.updateOne(
      { code: cancelled.promotion.code, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
    ).catch(() => {});
  }

  await recordStatusChange({
    orderId: cancelled._id,
    fromStatus: order.status,
    toStatus: 'cancelled',
    role: 'system',
    action: isPaid ? `${action} - đã hoàn vào ví ảo` : action,
    note: note + (isPaid ? ` · Đã hoàn ${amount.toLocaleString('vi-VN')}đ vào ví ảo` : ''),
  });
  return { order: cancelled, isPaid, amount };
};
