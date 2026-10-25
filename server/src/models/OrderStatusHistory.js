import mongoose from 'mongoose';

const orderStatusHistorySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    fromStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      default: '',
    },
    note: {
      type: String,
      default: '',
    },
    changedByRole: {
      type: String,
      enum: ['customer', 'restaurant', 'shipper', 'admin', 'system'],
      default: 'system',
    },
  },
  {
    timestamps: true,
    collection: 'order_status_history',
  },
);

const OrderStatusHistory = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);
export default OrderStatusHistory;
