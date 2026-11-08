import DriverDashboard from '../models/DriverDashboard.js';
import Order from '../models/Order.js';
import { sendRealtimeNotification } from '../socket.js';
import { cancelOrderBySystem } from './orderCancelService.js';
import { recordStatusChange } from './orderHistoryService.js';

/**
 * Admin recovery of an order a shipper took but cannot finish (delivery issue, shipper not showing up).
 * Every write is conditional on the status and shipper just read, so it never touches an order that moved on.
 */

export const SHIPPER_ACTIVE_STATUSES = ['ready_for_pickup', 'delivering'];

// The shipper may take a new order again (one active order per shipper, see shipperOrderService)
export const freeShipperSlot = (shipperId, orderId) =>
  DriverDashboard.updateOne({ userId: shipperId, activeOrderId: orderId }, { $set: { activeOrderId: null } });

const codeOf = (order) => order.orderCode || order.orderNumber;

/**
 * Give an order the shipper has not picked up yet back to the pool, so another shipper can take it.
 * The no-shipper timeout rules (TO-06, TO-07) count again from now, not from readyAt.
 * @returns {Promise<object | null>} updated order, null when it lost the race
 */
export const releaseOrderToPool = async (order, { note }) => {
  const now = new Date();
  const released = await Order.findOneAndUpdate(
    { _id: order._id, status: 'ready_for_pickup', shipper: order.shipper },
    {
      $set: {
        shipper: null,
        shipperAcceptedAt: null,
        customerWaitStartedAt: null,
        unansweredCallsAt: [],
        'timeouts.shipperAlertedAt': null,
        'timeouts.pickupAlertedAt': null,
        'timeouts.releasedAt': now,
      },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (!released) return null;

  await freeShipperSlot(order.shipper, order._id);
  await recordStatusChange({
    orderId: order._id,
    fromStatus: 'ready_for_pickup',
    toStatus: 'ready_for_pickup',
    role: 'admin',
    action: 'Đổi shipper',
    note: 'Đơn đang được tìm shipper khác',
  });
  await sendRealtimeNotification(order.shipper, {
    title: `Đơn #${codeOf(order)} đã được chuyển cho shipper khác`,
    message: note,
    type: 'delivery',
    orderId: order._id,
    link: '/shipper/dashboard',
  });
  return released;
};

/**
 * Cancel an order a shipper holds (ready_for_pickup or delivering) on behalf of the platform.
 * Paid orders get a refund request (R06); the shipper's slot is freed.
 * @returns {Promise<{ order, isPaid, amount } | null>} null when it lost the race
 */
export const cancelAssignedOrder = async (order, { reason, note, action }) => {
  const result = await cancelOrderBySystem(order, {
    reason,
    note,
    action,
    extraFilter: { shipper: order.shipper },
  });
  if (!result) return null;

  await freeShipperSlot(order.shipper, order._id);
  await sendRealtimeNotification(order.shipper, {
    title: `Đơn #${codeOf(order)} đã bị hủy`,
    message: `${note}. Bạn có thể nhận đơn mới.`,
    type: 'delivery',
    orderId: order._id,
    link: '/shipper/dashboard',
  });
  return result;
};
