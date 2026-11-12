import mongoose from 'mongoose';

const orderMessageSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true, collection: 'order_messages' },
);

orderMessageSchema.index({ order: 1, createdAt: 1 });

const OrderMessage = mongoose.model('OrderMessage', orderMessageSchema);

export default OrderMessage;
