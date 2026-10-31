import Order from '../models/Order.js';
import Shipper from '../models/Shipper.js';
import { getDeliveryArea } from '../utils/deliveryArea.js';
import { PAYMENT_ALLOWS_FULFILLMENT_FILTER } from './orderPolicy.js';

// Approval status of the shipper's profile, null when the account has none
export const getShipperStatus = async (userId) =>
  (await Shipper.findOne({ user: userId }).select('status').lean())?.status ?? null;

// Ready orders that no shipper has taken yet, with a valid payment state
// (online orders must be paid; COD is collected by the shipper)
const AVAILABLE_FILTER = { status: 'ready_for_pickup', shipper: null, ...PAYMENT_ALLOWS_FULFILLMENT_FILTER };

/**
 * List for ANY shipper browsing open orders, so it only contains what is needed to judge the trip.
 * Customer name, phone and exact address are only for the shipper assigned to the order (shipper module).
 */
export const listAvailableForPickup = async ({ page, limit }) => {
  const [orders, totalItems] = await Promise.all([
    Order.find(AVAILABLE_FILTER)
      .populate('restaurant', 'name address')
      .sort({ readyAt: 1 }) // waiting longest first
      .skip((page - 1) * limit)
      .limit(limit)
      .select('orderCode restaurant delivery.address delivery.type delivery.expectedAt items.quantity total payment readyAt')
      .lean(),
    Order.countDocuments(AVAILABLE_FILTER),
  ]);

  const items = orders.map((order) => ({
    _id: order._id,
    orderCode: order.orderCode,
    restaurant: { _id: order.restaurant._id, name: order.restaurant.name, address: order.restaurant.address },
    delivery: {
      area: getDeliveryArea(order.delivery.address),
      type: order.delivery.type,
      expectedAt: order.delivery.expectedAt,
    },
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: order.total,
    // COD: shipper must collect this amount from the customer
    amountToCollect: order.payment.method === 'cod' ? order.total : 0,
    readyAt: order.readyAt,
  }));

  return {
    items,
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  };
};
