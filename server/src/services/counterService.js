import Counter from '../models/Counter.js';
import { vietnamDateKey } from '../utils/date.js';

// Atomic: concurrent calls always get different numbers
export const getNextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return counter.seq;
};

// GN-0001, GN-0002, ...
export const generateOrderCode = async () => {
  const seq = await getNextSequence('order');
  return `GN-${String(seq).padStart(4, '0')}`;
};

// Kitchen ticket number: 1, 2, 3... per restaurant, starting again every day (Vietnam time)
export const kitchenTicketCounterKey = (restaurantId, now = new Date()) =>
  `kitchen:${restaurantId}:${vietnamDateKey(now)}`;

export const getNextKitchenTicketNo = (restaurantId, now = new Date()) =>
  getNextSequence(kitchenTicketCounterKey(restaurantId, now));
