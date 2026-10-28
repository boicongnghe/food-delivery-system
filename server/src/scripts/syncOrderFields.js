// One-off repair for orders saved before the payment/cancellation sync fix.
// Usage (from server/):
//   npm run migrate:order-fields            -> DRY RUN: only prints what would change
//   npm run migrate:order-fields -- --apply -> writes the changes
// Safe to run again: orders that are already consistent are skipped.
//
// Which side is the truth for each order:
// - created by checkout (orderNumber "ORD-...")  -> legacy fields (paymentStatus, cancelledBy...)
// - created by kitchen/seed data (orderCode "GN-...") -> nested fields (payment.*, cancellation.*)
import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import {
  canonicalCancellationFromLegacy,
  canonicalPaymentFromLegacy,
  legacyCancellationFromCanonical,
  legacyPaymentFromCanonical,
} from '../utils/orderFieldSync.js';

const apply = process.argv.includes('--apply');
const BATCH_SIZE = 200;

const isCheckoutOrder = (order) => String(order.orderNumber || '').startsWith('ORD-');

// Only keep the keys whose value really changes
const diff = (order, changes) =>
  Object.fromEntries(
    Object.entries(changes).filter(([path, value]) => {
      const current = path.split('.').reduce((object, key) => object?.[key], order);
      return JSON.stringify(current ?? null) !== JSON.stringify(value ?? null);
    }),
  );

// Checkout kept its timeline in order_status_history; copy real status changes into the order
const rebuildTimeline = async (order) => {
  const entries = await OrderStatusHistory.find({ order: order._id }).sort({ createdAt: 1 }).lean();
  const timeline = entries
    .filter((entry) => entry.fromStatus !== entry.toStatus)
    .map((entry) => ({
      status: entry.toStatus,
      at: entry.createdAt,
      byRole: entry.changedByRole === 'admin' ? 'system' : entry.changedByRole,
    }));
  return timeline.length > 0 ? timeline : [{ status: 'pending', at: order.createdAt, byRole: 'customer' }];
};

const changesFromLegacy = async (order) => {
  const payment = canonicalPaymentFromLegacy(order);
  if (order.status === 'cancelled' && payment.status === 'unpaid') payment.status = 'cancelled';

  const changes = {
    'payment.method': payment.method,
    'payment.status': payment.status,
    'payment.refundAmount': payment.refundAmount,
  };
  if (payment.status === 'paid' && !order.payment?.paidAt) changes['payment.paidAt'] = order.updatedAt;
  if (payment.status === 'refunded' && !order.payment?.refundedAt) changes['payment.refundedAt'] = order.updatedAt;
  if (order.cancelledBy && !order.cancellation?.by) {
    changes.cancellation = canonicalCancellationFromLegacy(order, order.updatedAt);
  }
  if (!order.statusHistory?.length) changes.statusHistory = await rebuildTimeline(order);
  return changes;
};

const changesFromCanonical = (order) => ({
  ...legacyPaymentFromCanonical(order.payment),
  ...legacyCancellationFromCanonical(order.cancellation),
});

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} on database "${mongoose.connection.name}"`);

  const stats = { scanned: 0, fromLegacy: 0, fromCanonical: 0 };
  let operations = [];

  const flush = async () => {
    if (apply && operations.length > 0) await Order.bulkWrite(operations, { ordered: false });
    operations = [];
  };

  for await (const order of Order.find().lean().cursor()) {
    stats.scanned += 1;
    const fromLegacy = isCheckoutOrder(order);
    const changes = diff(order, fromLegacy ? await changesFromLegacy(order) : changesFromCanonical(order));
    if (Object.keys(changes).length === 0) continue;

    stats[fromLegacy ? 'fromLegacy' : 'fromCanonical'] += 1;
    if (!apply) {
      console.log(`  ${order.orderCode || order.orderNumber}: ${Object.keys(changes).join(', ')}`);
    }
    operations.push({ updateOne: { filter: { _id: order._id }, update: { $set: changes } } });
    if (operations.length >= BATCH_SIZE) await flush();
  }
  await flush();

  console.log(
    `Scanned ${stats.scanned} orders. Checkout orders fixed: ${stats.fromLegacy}. ` +
      `Kitchen/seed orders fixed: ${stats.fromCanonical}.${apply ? '' : ' Run with --apply to write.'}`,
  );
};

run()
  .catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
