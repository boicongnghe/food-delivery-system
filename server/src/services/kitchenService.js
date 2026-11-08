import Restaurant from '../models/Restaurant.js';
import { getNextKitchenTicketNo } from './counterService.js';
import { calculateKitchenDueAt } from './orderTiming.js';
import { getOrderTimeouts } from './settingService.js';

/**
 * Fields written when the kitchen starts cooking, i.e. when a shipper accepts a confirmed order:
 * the handover deadline (TO-04: now + the restaurant's prepTime) and the kitchen ticket number of the day.
 * A request that then loses its race leaves a gap in the ticket numbering (accepted trade-off).
 */
export const getKitchenStartFields = async (restaurantId, now) => {
  const [restaurant, settings] = await Promise.all([
    Restaurant.findById(restaurantId).select('prepTime').lean(),
    getOrderTimeouts(),
  ]);
  const kitchenDueAt = calculateKitchenDueAt(now, restaurant?.prepTime || settings.defaultPrepTime);
  const kitchenTicketNo = await getNextKitchenTicketNo(restaurantId, now);
  return { kitchenDueAt, kitchenTicketNo };
};
