import DriverDashboard from '../models/DriverDashboard.js';
import Order from '../models/Order.js';
import { broadcastRealtimeNotification, sendRealtimeNotification } from '../socket.js';
import { cancelOrderBySystem } from './orderCancelService.js';
import { recordStatusChange } from './orderHistoryService.js';

/**
 * Admin recovery of an order a shipper took but cannot finish (delivery issue, shipper not showing up).
 * Every write is conditional on the status and shipper just read, so it never touches an order that moved on.
 */

/**
 * Order flow (docs/order-flow.md): pending -> confirmed (restaurant accepted, looking for a shipper)
 * -> preparing (a shipper accepted: the kitchen starts cooking) -> ready_for_pickup -> delivering -> delivered.
 */
// Statuses in which a shipper holds the order (one at a time per shipper)
export const SHIPPER_ACTIVE_STATUSES = ['preparing', 'ready_for_pickup', 'delivering'];
// Held by a shipper who has not picked the food up yet: can still go back to the pool
export const NOT_PICKED_UP_STATUSES = ['preparing', 'ready_for_pickup'];
// Shown to shippers when nobody holds them: a confirmed order, or one given back to the pool
export const SHIPPER_POOL_STATUSES = ['confirmed', ...NOT_PICKED_UP_STATUSES];

// The shipper may take a new order again (one active order per shipper, see shipperOrderService)
export const freeShipperSlot = (shipperId, orderId) =>
  DriverDashboard.updateOne({ userId: shipperId, activeOrderId: orderId }, { $set: { activeOrderId: null } });

const codeOf = (order) => order.orderCode || order.orderNumber;

/**
 * Give an order the shipper has not picked up yet back to the pool, so another shipper can take it.
 * The kitchen keeps its status (it may already be cooking). The no-shipper rules (TO-06, TO-07) count again from now.
 * @returns {Promise<object | null>} updated order, null when it lost the race
 */
export const releaseOrderToPool = async (order, { note }) => {
  const now = new Date();
  const released = await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: NOT_PICKED_UP_STATUSES }, shipper: order.shipper },
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
    fromStatus: released.status,
    toStatus: released.status,
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
  broadcastRealtimeNotification('shipper', 'new_pickup_order', {
    orderId: released._id,
    orderCode: codeOf(released),
  });
  return released;
};

/**
 * Cancel an order a shipper holds (preparing, ready_for_pickup or delivering) on behalf of the platform.
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
