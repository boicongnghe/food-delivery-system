import Counter from '../models/Counter.js';

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
