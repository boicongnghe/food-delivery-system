import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import { sendRealtimeNotification } from '../socket.js';
import { cancelOrderBySystem } from './orderCancelService.js';
import { VISIBLE_TO_RESTAURANT_FILTER, waitingSince } from './orderPolicy.js';
import { getOrderTimeouts } from './settingService.js';

/**
 * Order timeout rules of the restaurant side (docs/order-timeouts.md). Rule: a step that costs nobody
 * anything yet is automatic; a step where food was already cooked goes to the admin.
 *   TO-02 remind the restaurant      TO-03 auto-cancel an order nobody accepted
 *   TO-04 warn: past declared prep   TO-05 hand an overdue kitchen to the admin
 *   TO-06 tell the admin: no shipper TO-07 auto-cancel when still no shipper
 * Every write is conditional on the state just read, so a run that overlaps another one (or a second
 * server instance) never acts twice. Each step stamps order.timeouts.* so it runs once per order.
 */

const JOB_INTERVAL_MS = 60 * 1000;
const BATCH_LIMIT = 200; // per step and run; the next run picks up the rest

const minutesBefore = (now, minutes) => new Date(now.getTime() - minutes * 60 * 1000);
const codeOf = (order) => order.orderCode || order.orderNumber || '';

const notifyAdmins = async (payload) => {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
  await Promise.all(admins.map((admin) => sendRealtimeNotification(admin._id, payload)));
};

const ownerOf = async (restaurantId) => {
  const restaurant = await Restaurant.findById(restaurantId).select('owner name').lean();
  return restaurant || {};
};

// Stamp a timeout step; false when another run already did it
const stamp = async (orderId, status, field, now, extraFilter = {}) => {
  const result = await Order.updateOne(
    { _id: orderId, status, [`timeouts.${field}`]: null, ...extraFilter },
    { $set: { [`timeouts.${field}`]: now } },
  );
  return result.modifiedCount === 1;
};

// Pending orders the restaurant has seen for at least `minutes` (online orders count from payment)
const findWaitingOrders = async (minutes, now, extraFilter = {}) => {
  const limit = minutesBefore(now, minutes);
  const candidates = await Order.find({ status: 'pending', ...VISIBLE_TO_RESTAURANT_FILTER, createdAt: { $lte: limit }, ...extraFilter })
    .select('orderCode orderNumber status restaurant customer createdAt payment total totalPrice')
    .sort({ createdAt: 1 })
    .limit(BATCH_LIMIT)
    .lean();
  return candidates.filter((order) => waitingSince(order) <= limit);
};

// TO-02
const remindRestaurants = async (settings, now) => {
  const orders = await findWaitingOrders(settings.acceptRemind, now, { 'timeouts.acceptRemindedAt': null });
  let count = 0;
  for (const order of orders) {
    if (!(await stamp(order._id, 'pending', 'acceptRemindedAt', now))) continue;
    const { owner } = await ownerOf(order.restaurant);
    if (owner) {
      const minutesLeft = settings.acceptTimeout - settings.acceptRemind;
      await sendRealtimeNotification(owner, {
        title: `Đơn #${codeOf(order)} đang chờ quán nhận ⏰`,
        message: `Đơn sẽ tự hủy sau khoảng ${minutesLeft} phút nếu quán không nhận.`,
        type: 'order',
        orderId: order._id,
        link: `/restaurant/orders?order=${order._id}`,
      });
    }
    count += 1;
  }
  return count;
};

// TO-03
const cancelUnacceptedOrders = async (settings, now) => {
  const orders = await findWaitingOrders(settings.acceptTimeout, now);
  let count = 0;
  for (const order of orders) {
    const result = await cancelOrderBySystem(order, {
      reason: 'accept_timeout',
      note: `Quán không xác nhận đơn trong ${settings.acceptTimeout} phút`,
      action: 'Tự hủy: quán không nhận đơn',
    });
    if (!result) continue;
    const { owner } = await ownerOf(order.restaurant);
    await sendRealtimeNotification(order.customer, {
      title: 'Đơn hàng đã tự hủy ❌',
      message: `Quán chưa xác nhận đơn #${codeOf(order)} kịp thời nên đơn đã được hủy.${result.isPaid ? ' Yêu cầu hoàn tiền đã được tạo.' : ''}`,
      type: 'order',
      orderId: order._id,
      link: `/orders/${order._id}`,
    });
    if (owner) {
      await sendRealtimeNotification(owner, {
        title: `Đơn #${codeOf(order)} đã tự hủy`,
        message: `Quán không nhận đơn trong ${settings.acceptTimeout} phút. Đơn được tính vào tỉ lệ từ chối của quán.`,
        type: 'order',
        orderId: order._id,
        link: `/restaurant/orders?order=${order._id}`,
      });
    }
    count += 1;
  }
  return count;
};

const findPreparingPast = (dueBefore, field) =>
  Order.find({ status: 'preparing', kitchenDueAt: { $ne: null, $lte: dueBefore }, [`timeouts.${field}`]: null })
    .select('orderCode orderNumber restaurant customer kitchenDueAt')
    .limit(BATCH_LIMIT)
    .lean();

// TO-04
const warnSlowKitchens = async (settings, now) => {
  const orders = await findPreparingPast(now, 'prepWarnedAt');
  let count = 0;
  for (const order of orders) {
    if (!(await stamp(order._id, 'preparing', 'prepWarnedAt', now))) continue;
    const { owner } = await ownerOf(order.restaurant);
    if (owner) {
      await sendRealtimeNotification(owner, {
        title: `Đơn #${codeOf(order)} đã quá giờ chuẩn bị ⏱️`,
        message: `Hãy hoàn tất món và bấm "Đã xong". Sau ${settings.prepGrace} phút nữa đơn sẽ được chuyển cho quản trị viên xử lý.`,
        type: 'order',
        orderId: order._id,
        link: `/restaurant/orders?order=${order._id}`,
      });
    }
    await sendRealtimeNotification(order.customer, {
      title: 'Món đang được chuẩn bị lâu hơn dự kiến',
      message: `Quán cần thêm thời gian cho đơn #${codeOf(order)}, dự kiến chậm thêm tối đa khoảng ${settings.prepGrace} phút.`,
      type: 'order',
      orderId: order._id,
      link: `/orders/${order._id}`,
    });
    count += 1;
  }
  return count;
};

// TO-05 - not cancelled automatically: the food may be almost ready, the admin decides
const escalateOverdueKitchens = async (settings, now) => {
  const orders = await findPreparingPast(minutesBefore(now, settings.prepGrace), 'prepEscalatedAt');
  let count = 0;
  for (const order of orders) {
    if (!(await stamp(order._id, 'preparing', 'prepEscalatedAt', now))) continue;
    const { name } = await ownerOf(order.restaurant);
    await notifyAdmins({
      title: `Đơn #${codeOf(order)} quá giờ chuẩn bị`,
      message: `${name || 'Nhà hàng'} đã quá giờ chuẩn bị hơn ${settings.prepGrace} phút. Liên hệ quán hoặc hủy thay khách.`,
      type: 'order',
      orderId: order._id,
      link: '/admin/orders?status=attention',
    });
    count += 1;
  }
  return count;
};

const findWithoutShipper = (readyBefore, extraFilter = {}) =>
  Order.find({ status: 'ready_for_pickup', shipper: null, readyAt: { $ne: null, $lte: readyBefore }, ...extraFilter })
    .select('orderCode orderNumber status restaurant customer readyAt payment total totalPrice')
    .limit(BATCH_LIMIT)
    .lean();

// TO-06
const alertMissingShippers = async (settings, now) => {
  const orders = await findWithoutShipper(minutesBefore(now, settings.shipperRemind), { 'timeouts.shipperAlertedAt': null });
  let count = 0;
  for (const order of orders) {
    if (!(await stamp(order._id, 'ready_for_pickup', 'shipperAlertedAt', now, { shipper: null }))) continue;
    const { name } = await ownerOf(order.restaurant);
    await notifyAdmins({
      title: `Đơn #${codeOf(order)} chưa có shipper`,
      message: `Món của ${name || 'nhà hàng'} đã sẵn sàng ${settings.shipperRemind} phút nhưng chưa có shipper nhận. Tự hủy sau ${settings.shipperTimeout} phút.`,
      type: 'delivery',
      orderId: order._id,
      link: '/admin/orders?status=attention',
    });
    count += 1;
  }
  return count;
};

// TO-07 - compensating the restaurant for cooked food is out of scope (decision D2): only recorded here
const cancelOrdersWithoutShipper = async (settings, now) => {
  const orders = await findWithoutShipper(minutesBefore(now, settings.shipperTimeout));
  let count = 0;
  for (const order of orders) {
    const result = await cancelOrderBySystem(order, {
      reason: 'no_shipper',
      note: `Không tìm được shipper sau ${settings.shipperTimeout} phút`,
      action: 'Tự hủy: không có shipper',
      extraFilter: { shipper: null },
    });
    if (!result) continue;
    const { owner } = await ownerOf(order.restaurant);
    await sendRealtimeNotification(order.customer, {
      title: 'Đơn hàng đã tự hủy ❌',
      message: `Chưa tìm được shipper cho đơn #${codeOf(order)} nên đơn đã được hủy.${result.isPaid ? ' Yêu cầu hoàn tiền đã được tạo.' : ''}`,
      type: 'order',
      orderId: order._id,
      link: `/orders/${order._id}`,
    });
    if (owner) {
      await sendRealtimeNotification(owner, {
        title: `Đơn #${codeOf(order)} đã tự hủy: không có shipper`,
        message: 'Đơn không bị tính lỗi cho quán. Nếu món đã nấu, vui lòng liên hệ quản trị viên (nền tảng chưa bù tự động).',
        type: 'order',
        orderId: order._id,
        link: `/restaurant/orders?order=${order._id}`,
      });
    }
    count += 1;
  }
  return count;
};

// Reminders before the automatic actions they announce
const STEPS = {
  remindRestaurants,
  cancelUnacceptedOrders,
  warnSlowKitchens,
  escalateOverdueKitchens,
  alertMissingShippers,
  cancelOrdersWithoutShipper,
};

/** One pass of every step. A failing step is logged and never stops the others. */
export const runOrderTimeouts = async (now = new Date()) => {
  const settings = await getOrderTimeouts();
  const results = {};
  for (const [name, step] of Object.entries(STEPS)) {
    try {
      results[name] = await step(settings, now);
    } catch (error) {
      results[name] = 0;
      console.error(`[order-timeouts] ${name} failed: ${error.message}`);
    }
  }
  return results;
};

/** Run every minute in this server process (DISABLE_ORDER_JOBS=true turns it off, e.g. for tests). */
export const startOrderTimeoutJobs = () => {
  if (process.env.DISABLE_ORDER_JOBS === 'true') return null;
  let running = false;
  const timer = setInterval(async () => {
    if (running) return; // a slow run is never overlapped by the next one
    running = true;
    try {
      await runOrderTimeouts();
    } finally {
      running = false;
    }
  }, JOB_INTERVAL_MS);
  timer.unref();
  return timer;
};
