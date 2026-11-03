import OrderStatusHistory from '../models/OrderStatusHistory.js';

/**
 * Customer timeline entry (collection order_status_history) for a step made by any actor:
 * customer, kitchen, shipper, admin or system. Called after the change itself is saved, so a failure here
 * is logged and never undoes or fails that change. Transitions are conditional, so a retried request
 * fails before reaching this point and never writes the same step twice.
 */
export const recordStatusChange = async ({ orderId, fromStatus, toStatus, role, action, note = '' }) => {
  try {
    await OrderStatusHistory.create({ order: orderId, fromStatus, toStatus, action, note, changedByRole: role });
  } catch (error) {
    console.error(`[OrderStatusHistory] Could not record ${fromStatus} -> ${toStatus} of order ${orderId}: ${error.message}`);
  }
};
