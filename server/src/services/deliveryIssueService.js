import mongoose from 'mongoose';
import DeliveryIssue, { DELIVERY_ISSUE_STATUSES } from '../models/DeliveryIssue.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';
import { emitWalletUpdate, sendRealtimeNotification } from '../socket.js';
import { getNextSequence } from './counterService.js';
import {
  assertHearingEndedForPenalty,
  countHearingMessages,
  getHearingState,
  notifyHearingOutcome,
  notifyHearingUpdated,
} from './hearingService.js';
import {
  applySuspension,
  assertShipperCanBeLocked,
  buildPenaltyRecord,
  collectFine,
  getViolationSummary,
} from './violationService.js';
import {
  countByStatus,
  ensureOwnEvidence,
} from './feedbackPolicy.js';
import {
  NOT_PICKED_UP_STATUSES,
  SHIPPER_ACTIVE_STATUSES as ACTIVE_STATUSES,
  cancelAssignedOrder,
  releaseOrderToPool,
} from './orderAssignmentService.js';

// SC-0001, SC-0002, ...
const generateIssueCode = async () => `SC-${String(await getNextSequence('deliveryIssue')).padStart(4, '0')}`;

// ---------- Shipper (UC34 - API only, the shipper screen belongs to the shipper module) ----------

export const createDeliveryIssue = async (
  shipperId,
  orderId,
  { type, description, images, waitedMinutes, unansweredCalls },
) => {
  const order = await Order.findOne({ _id: orderId, shipper: shipperId })
    .select('orderCode status restaurant customer customerWaitStartedAt unansweredCallsAt')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng bạn nhận giao');
  }
  if (!ACTIVE_STATUSES.includes(order.status)) {
    throw new ApiError(409, 'Chỉ có thể báo cáo sự cố khi đơn đang được giao');
  }
  let verifiedWaitMinutes = 0;
  let verifiedUnansweredCalls = 0;
  if (['customer_unreachable', 'customer_refused'].includes(type)) {
    const elapsedMs = order.customerWaitStartedAt
      ? Date.now() - new Date(order.customerWaitStartedAt).getTime()
      : 0;
    verifiedWaitMinutes = Math.floor(elapsedMs / 60000);
    verifiedUnansweredCalls = (order.unansweredCallsAt || []).filter(
      callAt => new Date(callAt) >= new Date(order.customerWaitStartedAt || 0),
    ).length;
    if (verifiedWaitMinutes < 8 || verifiedUnansweredCalls < 2) {
      throw new ApiError(400, 'Cần chờ ít nhất 8 phút và ghi nhận tối thiểu 2 cuộc gọi không được trả lời');
    }
  }
  if (await DeliveryIssue.exists({ order: order._id, status: 'open' })) {
    throw new ApiError(409, 'Đơn hàng đã có báo cáo sự cố đang chờ xử lý');
  }
  ensureOwnEvidence(images, 'delivery-issues', shipperId);

  const issue = await DeliveryIssue.create({
    code: await generateIssueCode(),
    order: order._id,
    orderCode: order.orderCode,
    shipper: shipperId,
    restaurant: order.restaurant,
    customer: order.customer,
    type,
    description,
    waitedMinutes: verifiedWaitMinutes,
    unansweredCalls: verifiedUnansweredCalls,
    images,
  });
  const flagged = await Order.updateOne(
    { _id: order._id, shipper: shipperId, status: { $in: ACTIVE_STATUSES } },
    { $set: { deliveryIssueFlagged: true } },
  );
  if (!flagged.modifiedCount) {
    await DeliveryIssue.deleteOne({ _id: issue._id });
    throw new ApiError(409, 'Đơn hàng vừa rời trạng thái giao hàng đang hoạt động');
  }
  return issue;
};

// ---------- Admin (UC45) ----------

export const listDeliveryIssues = async ({ page, limit, keyword, status, type }) => {
  const baseFilter = {};
  if (type !== 'all') baseFilter.type = type;
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    baseFilter.$or = [{ code: regex }, { orderCode: regex }];
  }
  const filter = status === 'all' ? baseFilter : { ...baseFilter, status };

  const [items, totalItems, counts] = await Promise.all([
    DeliveryIssue.find(filter)
      .populate('shipper', 'fullName phone')
      .populate('restaurant', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DeliveryIssue.countDocuments(filter),
    countByStatus(DeliveryIssue, baseFilter, DELIVERY_ISSUE_STATUSES),
  ]);
  const withHearing = items.map((issue) => ({ ...issue, hearingState: getHearingState(issue) }));
  return { ...toPage(withHearing, { page, limit }, totalItems), counts };
};

export const getDeliveryIssueDetail = async (issueId) => {
  const issue = await DeliveryIssue.findById(issueId)
    .populate('shipper', 'fullName phone email isActive')
    .populate('customer', 'fullName phone email isActive')
    .populate('restaurant', 'name phone address status owner')
    .populate('order', 'orderCode items subtotal packagingFee shippingFee discount promotion total delivery payment status statusHistory shipper createdAt')
    .populate('resolution.by', 'fullName')
    .populate('resolution.orderActionBy', 'fullName')
    .populate('hearing.openedBy', 'fullName')
    .lean();
  if (!issue) {
    throw new ApiError(404, 'Không tìm thấy báo cáo sự cố');
  }

  const [summary, hearingMessageCount] = await Promise.all([
    getViolationSummary(issue),
    countHearingMessages('delivery_issue', issue._id),
  ]);
  return { ...issue, ...summary, hearingState: getHearingState(issue), hearingMessageCount };
};

const ORDER_FIELDS_FOR_ACTION = 'orderCode orderNumber status shipper restaurant customer payment total totalPrice';

// The order action must fit the order as it is now: still held by the reporting shipper, and not picked up for a release
const assertOrderActionAllowed = (issue, order, orderAction) => {
  const heldByReporter =
    order && String(order.shipper) === String(issue.shipper) && ACTIVE_STATUSES.includes(order.status);
  if (!heldByReporter) {
    throw new ApiError(409, 'Đơn hàng không còn do shipper báo cáo giữ, không thể đổi trạng thái đơn từ báo cáo này');
  }
  if (orderAction === 'release' && !NOT_PICKED_UP_STATUSES.includes(order.status)) {
    throw new ApiError(409, 'Shipper đã lấy hàng, không thể trả đơn về hàng chờ', [
      { field: 'orderAction', message: 'Hãy hủy đơn hoặc giữ nguyên để shipper tiếp tục giao' },
    ]);
  }
};

const notifyIssueCancellation = async (issue, order, result, reasonNote) => {
  const code = order.orderCode || order.orderNumber;
  await sendRealtimeNotification(order.customer, {
    title: 'Đơn hàng đã bị hủy',
    message: `Đơn #${code} đã được hủy do sự cố giao hàng: ${reasonNote}.${result.isPaid ? ' Tiền hoàn đã được cộng vào ví ảo của bạn.' : ''}`,
    type: 'order',
    orderId: order._id,
    // Same as the admin cancellation: a paid order sends the customer to the refunded wallet
    link: result.isPaid ? '/wallet' : `/orders/${order._id}`,
  });
  if (issue.restaurant?.owner) {
    await sendRealtimeNotification(issue.restaurant.owner, {
      title: `Đơn #${code} đã bị hủy do sự cố giao hàng`,
      message: reasonNote,
      type: 'order',
      orderId: order._id,
      link: `/restaurant/orders?order=${order._id}`,
    });
  }
};

// Cancel / release the order. Conditional on the order just read, so two admins never act on it twice.
const applyOrderAction = async (issue, order, orderAction, note) => {
  const reasonNote = `Sự cố ${issue.code}: ${note}`;
  const result =
    orderAction === 'release'
      ? await releaseOrderToPool(order, { note: reasonNote })
      : await cancelAssignedOrder(order, {
          reason: 'delivery_issue',
          note: reasonNote,
          action: 'Hủy đơn do sự cố giao hàng',
        });
  if (!result) {
    throw new ApiError(409, 'Đơn hàng vừa thay đổi trạng thái, vui lòng tải lại báo cáo');
  }
  if (orderAction === 'cancel') {
    await notifyIssueCancellation(issue, order, result, reasonNote);
  }
};

/**
 * Cancel the order or send it back to the pool, right away and apart from the decision: the order of a stuck
 * shipper cannot wait for the hearing. Once per report, while the reporting shipper still holds the order.
 */
export const applyIssueOrderAction = async (adminId, issueId, { orderAction, note }) => {
  const issue = await DeliveryIssue.findById(issueId).populate('restaurant', 'owner').lean();
  if (!issue) {
    throw new ApiError(404, 'Không tìm thấy báo cáo sự cố');
  }
  if (issue.status !== 'open') {
    throw new ApiError(409, 'Báo cáo sự cố đã được xử lý trước đó');
  }
  if (issue.resolution?.orderAction && issue.resolution.orderAction !== 'none') {
    throw new ApiError(409, 'Đơn hàng của báo cáo này đã được xử lý');
  }
  const order = await Order.findById(issue.order).select(ORDER_FIELDS_FOR_ACTION).lean();
  assertOrderActionAllowed(issue, order, orderAction);

  await applyOrderAction(issue, order, orderAction, note);
  await DeliveryIssue.updateOne(
    { _id: issueId },
    {
      $set: {
        'resolution.orderAction': orderAction,
        'resolution.orderActionBy': adminId,
        'resolution.orderActionAt': new Date(),
      },
    },
  );
  return getDeliveryIssueDetail(issueId);
};

/**
 * Decision on the report. Dismissing it, or upholding it without a penalty, is possible at any time;
 * a penalty needs a hearing (shipper, customer, restaurant) that has ended. A fine is taken from the wallet of
 * the penalized party in the same transaction that saves the decision.
 */
export const resolveDeliveryIssue = async (adminId, issueId, { decision, note, penalty = null }) => {
  const issue = await DeliveryIssue.findById(issueId).populate('restaurant', 'owner').lean();
  if (!issue) {
    throw new ApiError(404, 'Không tìm thấy báo cáo sự cố');
  }
  if (issue.status !== 'open') {
    throw new ApiError(409, 'Báo cáo sự cố đã được xử lý trước đó');
  }
  if (penalty) assertHearingEndedForPenalty(issue);
  const { record: penaltyRecord, threshold } = await buildPenaltyRecord(issue, penalty);
  await assertShipperCanBeLocked(
    penaltyRecord,
    'Hãy hủy hoặc trả đơn về hàng chờ ở mục "Xử lý đơn hàng" trước khi khóa tài khoản',
  );

  let customerBalance = null;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Only an open report can be concluded: two admins at once cannot both win
      const claimed = await DeliveryIssue.findOneAndUpdate(
        { _id: issueId, status: 'open' },
        { $set: { status: decision } },
        { returnDocument: 'after', runValidators: true, session },
      );
      if (!claimed) {
        throw new ApiError(409, 'Báo cáo vừa được xử lý bởi người khác, vui lòng tải lại');
      }
      ({ customerBalance } = await collectFine(issue, penaltyRecord, {
        caseLabel: `sự cố giao hàng ${issue.code}`,
        session,
      }));
      // Dotted paths keep the order action recorded earlier
      await DeliveryIssue.updateOne(
        { _id: issueId },
        {
          $set: {
            'resolution.note': note,
            'resolution.penalty': penaltyRecord,
            'resolution.by': adminId,
            'resolution.at': new Date(),
          },
        },
        { runValidators: true, session },
      );
    });
  } finally {
    await session.endSession();
  }
  if (customerBalance !== null) emitWalletUpdate(issue.customer, customerBalance);

  await applySuspension(adminId, issue, penaltyRecord, { threshold, caseLabel: `sự cố giao hàng ${issue.code}` });
  const hasOpenIssue = await DeliveryIssue.exists({ order: issue.order, status: 'open' });
  await Order.updateOne(
    { _id: issue.order },
    { $set: { deliveryIssueFlagged: Boolean(hasOpenIssue) } },
  );
  notifyHearingUpdated('delivery_issue', issue);
  await notifyHearingOutcome('delivery_issue', issue, { status: decision, note, penalty: penaltyRecord });
  return getDeliveryIssueDetail(issueId);
};
