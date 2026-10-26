import mongoose from 'mongoose';

// Named sequences, e.g. { _id: 'order', seq: 42 } -> order code GN-0042
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
