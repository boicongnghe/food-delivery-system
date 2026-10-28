import mongoose from 'mongoose';

// pending -> preparing -> ready_for_pickup -> delivering -> delivered, or cancelled
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'delivering',
  'delivered',
  'cancelled',
];
export const PAYMENT_METHODS = ['cod', 'momo', 'vnpay', 'banking'];
export const PAYMENT_STATUSES = ['pending', 'unpaid', 'paid', 'failed', 'refunded', 'cancelled'];
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
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    options: { type: [orderOptionSchema], default: [] },
    note: { type: String, default: '' },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: true },
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
    orderCode: { type: String, index: true },
    orderNumber: { type: String, index: true },
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
    promotion: {
      code: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
    },
    total: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },

    delivery: {
      recipientName: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      type: { type: String, enum: DELIVERY_TYPES, default: 'standard' },
      expectedAt: { type: Date, default: null },
    },
    deliveryAddress: {
      recipientName: { type: String, default: '' },
      phone: { type: String, default: '' },
      addressLine: { type: String, default: '' },
      note: { type: String, default: '' },
    },
    customerNote: { type: String, default: '' },

    payment: {
      method: { type: String, enum: PAYMENT_METHODS, default: 'cod' },
      status: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
      paidAt: { type: Date, default: null },
      refundedAt: { type: Date, default: null },
      refundAmount: { type: Number, min: 0, default: 0 },
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'banking',
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
    },

    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    statusHistory: { type: [statusHistorySchema], default: [] },
    acceptedAt: { type: Date, default: null },
    shipperAcceptedAt: { type: Date, default: null },
    deliveryIssueFlagged: { type: Boolean, default: false },
    payoutCreditedAt: { type: Date, default: null },
    customerWaitStartedAt: { type: Date, default: null },
    unansweredCallsAt: { type: [Date], default: [] },
    readyAt: { type: Date, default: null },
    kitchenTicketNo: { type: Number, default: null },
    kitchenDueAt: { type: Date, default: null },
    cancellation: {
      by: { type: String, enum: [...ACTOR_ROLES, null], default: null },
      reason: { type: String, default: '' },
      note: { type: String, default: '' },
      at: { type: Date, default: null },
    },
    cancelReason: { type: String, default: null },
    cancelledBy: {
      type: String,
      enum: ['customer', 'restaurant', 'shipper', 'system', null],
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ['not_applicable', 'pending', 'refunded', 'rejected'],
      default: 'not_applicable',
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  },
);

orderSchema.pre('validate', function () {
  if (!this.orderCode && this.orderNumber) {
    this.orderCode = this.orderNumber;
  }
  if (!this.orderNumber && this.orderCode) {
    this.orderNumber = this.orderCode;
  }
  if (!this.total && this.totalPrice) {
    this.total = this.totalPrice;
  }
  if (!this.totalPrice && this.total) {
    this.totalPrice = this.total;
  }
  if (this.deliveryAddress && (!this.delivery || !this.delivery.address)) {
    this.delivery = {
      recipientName: this.deliveryAddress.recipientName || '',
      phone: this.deliveryAddress.phone || '',
      address: this.deliveryAddress.addressLine || '',
      type: 'standard',
      expectedAt: null,
    };
  }
  if (this.delivery && (!this.deliveryAddress || !this.deliveryAddress.addressLine)) {
    this.deliveryAddress = {
      recipientName: this.delivery.recipientName || '',
      phone: this.delivery.phone || '',
      addressLine: this.delivery.address || '',
      note: this.customerNote || '',
    };
  }
  if (this.paymentMethod && (!this.payment || !this.payment.method)) {
    this.payment = {
      method: this.paymentMethod,
      status: this.paymentStatus === 'paid' ? 'paid' : 'unpaid',
      paidAt: this.paymentStatus === 'paid' ? new Date() : null,
      refundedAt: null,
      refundAmount: 0,
    };
  }
  if (Array.isArray(this.items)) {
    for (const item of this.items) {
      if (!item.unitPrice && item.price) item.unitPrice = item.price;
      if (!item.price && item.unitPrice) item.price = item.unitPrice;
      if (!item.lineTotal) item.lineTotal = (item.unitPrice || item.price || 0) * (item.quantity || 1);
    }
  }
});

orderSchema.index({ restaurant: 1, status: 1, createdAt: 1 });
orderSchema.index({ status: 1, shipper: 1, readyAt: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
