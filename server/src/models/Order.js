import mongoose from 'mongoose';

const orderItemSubSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: true },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    shipper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    items: [orderItemSubSchema],
    deliveryAddress: {
      recipientName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine: { type: String, required: true },
      note: { type: String, default: '' },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 15000,
      min: 0,
    },
    promotion: {
      code: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['banking', 'cod', 'momo'],
      default: 'banking',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'],
      default: 'pending',
    },
    cancelReason: {
      type: String,
      default: null,
    },
    cancelledBy: {
      type: String,
      enum: ['customer', 'restaurant', 'system', null],
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

const Order = mongoose.model('Order', orderSchema);
export default Order;
