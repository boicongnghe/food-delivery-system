// Kitchen preparation time by delivery type, used to set the shipper handover deadline.
// Fixed for now; later the owner may choose it when accepting the order.
export const PREP_MINUTES = { express: 10, standard: 20 };

export const calculateKitchenDueAt = (acceptedAt, deliveryType) =>
  new Date(acceptedAt.getTime() + (PREP_MINUTES[deliveryType] ?? PREP_MINUTES.standard) * 60 * 1000);

// "Khách quen": at least this many delivered orders at the same restaurant in the last N days
export const REGULAR_CUSTOMER_MIN_ORDERS = 3;
export const REGULAR_CUSTOMER_WINDOW_DAYS = 90;
