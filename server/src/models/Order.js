import mongoose from 'mongoose';

// pending -> preparing -> ready_for_pickup -> delivering -> delivered, or cancelled
export const ORDER_STATUSES = ['pending', 'preparing', 'ready_for_pickup', 'delivering', 'delivered', 'cancelled'];
export const PAYMENT_METHODS = ['cod', 'momo', 'vnpay'];
// unpaid: COD not collected yet | cancelled: COD order cancelled, nothing to refund
export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded', 'cancelled'];
export const ACTOR_ROLES = ['customer', 'restaurant', 'shipper', 'system'];
export const DELIVERY_TYPES = ['express', 'standard'];

const orderOptionSchema = new mongoose.Schema(
  {
    groupName: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

// Snapshot of the dish at order time: later menu changes never affect old orders
const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 }, // dish price + selected options
    quantity: { type: Number, required: true, min: 1 },
    options: { type: [orderOptionSchema], default: [] },
    note: { type: String, default: '' },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true },
    byRole: { type: String, enum: ACTOR_ROLES, required: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true }, // e.g. GN-0042
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, 'Đơn hàng phải có ít nhất 1 món'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    packagingFee: { type: Number, min: 0, default: 0 },
    shippingFee: { type: Number, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },

    delivery: {
      recipientName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      type: { type: String, enum: DELIVERY_TYPES, default: 'standard' },
      expectedAt: { type: Date, default: null },
    },
    customerNote: { type: String, default: '' },

    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      status: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
      paidAt: { type: Date, default: null },
      refundedAt: { type: Date, default: null },
      refundAmount: { type: Number, min: 0, default: 0 },
    },

    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    statusHistory: { type: [statusHistorySchema], default: [] },
    acceptedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    cancellation: {
      by: { type: String, enum: [...ACTOR_ROLES, null], default: null },
      reason: { type: String, default: '' },
      note: { type: String, default: '' },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

orderSchema.index({ restaurant: 1, status: 1, createdAt: 1 }); // kitchen board
orderSchema.index({ status: 1, shipper: 1, readyAt: 1 }); // shipper "available for pickup" list

const Order = mongoose.model('Order', orderSchema);

export default Order;
