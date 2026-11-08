// Shared business rules for orders (kitchen, shipper and later checkout use the same filters)

// 'banking' = bank transfer / VietQR from checkout: the money must arrive before the kitchen sees the order
export const ONLINE_PAYMENT_METHODS = ['momo', 'vnpay', 'banking'];

// Payment states of an online order whose money never arrived: still on the payment page (unpaid,
// or pending / failed in data older than the payment field sync), or cancelled there before paying
// (the Order model turns "unpaid" into "cancelled" on cancellation)
const NEVER_PAID_STATUSES = ['unpaid', 'pending', 'failed', 'cancelled'];

export const NEVER_PAID_ONLINE_FILTER = {
  'payment.method': { $in: ONLINE_PAYMENT_METHODS },
  'payment.status': { $in: NEVER_PAID_STATUSES },
};

// Same rule for an order already loaded (needs payment.method and payment.status)
export const isNeverPaidOnline = (order) =>
  ONLINE_PAYMENT_METHODS.includes(order.payment?.method) && NEVER_PAID_STATUSES.includes(order.payment?.status);

// Real orders: an abandoned online checkout is not one. Admin statistics, restaurant reports and
// customer complaints all count with this filter so their numbers agree.
export const PLACED_ORDER_FILTER = { $nor: [NEVER_PAID_ONLINE_FILTER] };

// The restaurant sees exactly the real orders: never an online order the customer did not pay,
// not even after the customer cancelled it on the payment page
export const VISIBLE_TO_RESTAURANT_FILTER = PLACED_ORDER_FILTER;

// Payment state that allows cooking / handing to a shipper:
// COD -> not collected yet (shipper collects it), online -> already paid
export const PAYMENT_ALLOWS_FULFILLMENT_FILTER = {
  $or: [
    { 'payment.method': 'cod', 'payment.status': 'unpaid' },
    { 'payment.method': { $in: ONLINE_PAYMENT_METHODS }, 'payment.status': 'paid' },
  ],
};

// A paid order that gets cancelled owes the customer a refund.
// With Virtual Wallet enabled, refunds are credited directly to the customer's wallet.
export const refundRequestFields = (amount, at) => ({
  'refund.status': 'succeeded',
  'refund.amount': amount,
  'refund.requestedAt': at,
  'refund.completedAt': at,
  'refund.reference': 'WALLET_REFUND',
  'refund.note': 'Đã hoàn tiền tự động vào ví ảo của khách hàng',
  'payment.status': 'refunded',
  'payment.refundedAt': at,
  'payment.refundAmount': amount,
});

// Moment the restaurant could first see a pending order: an online order only once it is paid
// (the customer may spend minutes on the payment page). Needs createdAt, payment.method, payment.paidAt.
export const waitingSince = (order) => {
  const createdAt = new Date(order.createdAt);
  const paidAt = order.payment?.paidAt ? new Date(order.payment.paidAt) : null;
  return order.payment?.method !== 'cod' && paidAt && paidAt > createdAt ? paidAt : createdAt;
};

// Cancellations counted as the restaurant's fault (reject rate): its own rejections, and orders it let
// expire without accepting (TO-03, cancelled by the system with this reason)
export const RESTAURANT_FAULT_REASONS = ['accept_timeout'];
export const isRestaurantFault = (cancellation) =>
  cancellation?.by === 'restaurant' || RESTAURANT_FAULT_REASONS.includes(cancellation?.reason);
