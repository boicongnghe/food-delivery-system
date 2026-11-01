import mongoose from 'mongoose';
import {
  canonicalCancellationFromLegacy,
  canonicalPaymentFromLegacy,
  legacyCancellationFromCanonical,
  legacyPaymentFromCanonical,
} from '../utils/orderFieldSync.js';

// Set explicitly in this save (works for new documents too; $isDefault is unreliable for nested paths)
const wasSet = (doc, path) => doc.isModified(path);

const LEGACY_PAYMENT_PATHS = ['paymentMethod', 'paymentStatus', 'refundStatus', 'refundAmount'];
const CANONICAL_PAYMENT_PATHS = ['payment.method', 'payment.status', 'payment.refundAmount'];

/**
 * Checkout writes the legacy top-level fields, kitchen/shipper/analytics read the nested ones.
 * Whichever side was changed in this save drives the other (nested wins if both changed).
 * Only runs on document saves; services using findOneAndUpdate must set both sides themselves.
 */
const syncPaymentAndCancellation = (doc) => {
  const now = new Date();

  const canonicalChanged = CANONICAL_PAYMENT_PATHS.some((path) => wasSet(doc, path));
  const legacyChanged = LEGACY_PAYMENT_PATHS.some((path) => wasSet(doc, path));
  if (legacyChanged && !canonicalChanged) {
    const next = canonicalPaymentFromLegacy(doc);
    if (next.status === 'paid' && doc.payment.status !== 'paid') doc.payment.paidAt = now;
    if (next.status === 'refunded' && doc.payment.status !== 'refunded') doc.payment.refundedAt = now;
    doc.payment.method = next.method;
    doc.payment.status = next.status;
    doc.payment.refundAmount = next.refundAmount;
  } else if (canonicalChanged || doc.isNew) {
    // New order with no payment given: the two default sets differ, nested ones are the truth
    doc.set(legacyPaymentFromCanonical(doc.payment));
  }

  if (wasSet(doc, 'cancellation.by')) {
    doc.set(legacyCancellationFromCanonical(doc.cancellation));
  } else if (wasSet(doc, 'cancelledBy') && doc.cancelledBy) {
    doc.cancellation = canonicalCancellationFromLegacy(doc, now);
  }

  if (!wasSet(doc, 'status')) return;
  // Cancelled before any money arrived: nothing to refund
  if (doc.status === 'cancelled' && doc.payment.status === 'unpaid') {
    doc.payment.status = 'cancelled';
    doc.paymentStatus = 'cancelled';
  }
  // COD is paid when the customer receives the food
  if (doc.status === 'delivered' && doc.payment.method === 'cod' && doc.payment.status === 'unpaid') {
    doc.payment.status = 'paid';
    doc.payment.paidAt = now;
    doc.paymentStatus = 'paid';
  }
};

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
  syncPaymentAndCancellation(this);
  if (Array.isArray(this.items)) {
    for (const item of this.items) {
      if (!item.unitPrice && item.price) item.unitPrice = item.price;
      if (!item.price && item.unitPrice) item.price = item.unitPrice;
      if (!item.lineTotal) item.lineTotal = (item.unitPrice || item.price || 0) * (item.quantity || 1);
    }
  }
});

// Keep the embedded timeline (kitchen drawer) in step with status changes made through document saves.
// Services may set order.$locals.changedByRole ('customer' | 'restaurant' | 'shipper' | 'system').
orderSchema.pre('validate', function () {
  const last = this.statusHistory[this.statusHistory.length - 1];
  if (!wasSet(this, 'status') && this.statusHistory.length > 0) return;
  if (last?.status === this.status) return;

  const byRole =
    this.$locals.changedByRole ||
    (this.status === 'cancelled' ? this.cancellation?.by : null) ||
    (this.isNew ? 'customer' : 'system');
  this.statusHistory.push({ status: this.status, at: new Date(), byRole });
});

orderSchema.index({ restaurant: 1, status: 1, createdAt: 1 });
orderSchema.index({ status: 1, shipper: 1, readyAt: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
