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
