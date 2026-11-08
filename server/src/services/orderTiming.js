// Shipper handover deadline: accepted time + the restaurant's declared preparation time (TO-04)
export const calculateKitchenDueAt = (acceptedAt, prepMinutes) => new Date(acceptedAt.getTime() + prepMinutes * 60 * 1000);

// "Khách quen": at least this many delivered orders at the same restaurant in the last N days
export const REGULAR_CUSTOMER_MIN_ORDERS = 3;
export const REGULAR_CUSTOMER_WINDOW_DAYS = 90;
