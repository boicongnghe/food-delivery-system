// Shared business rules for orders (kitchen, shipper and later checkout use the same filters)

// 'banking' = bank transfer / VietQR from checkout: the money must arrive before the kitchen sees the order
export const ONLINE_PAYMENT_METHODS = ['momo', 'vnpay', 'banking'];

// Online order whose payment is not confirmed yet: the customer may still be on the payment page.
// The restaurant must not see or cook it.
export const AWAITING_ONLINE_PAYMENT_FILTER = {
  'payment.method': { $in: ONLINE_PAYMENT_METHODS },
  'payment.status': 'unpaid',
};

// Orders the restaurant is allowed to see on its board (anything except "still paying online")
export const VISIBLE_TO_RESTAURANT_FILTER = { $nor: [AWAITING_ONLINE_PAYMENT_FILTER] };

// Payment state that allows cooking / handing to a shipper:
// COD -> not collected yet (shipper collects it), online -> already paid
export const PAYMENT_ALLOWS_FULFILLMENT_FILTER = {
  $or: [
    { 'payment.method': 'cod', 'payment.status': 'unpaid' },
    { 'payment.method': { $in: ONLINE_PAYMENT_METHODS }, 'payment.status': 'paid' },
  ],
};
