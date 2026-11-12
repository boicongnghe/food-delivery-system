import DeliveryIssue, { DELIVERY_ISSUE_STATUSES } from '../models/DeliveryIssue.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';
import { sendRealtimeNotification } from '../socket.js';
import { getNextSequence } from './counterService.js';
import { getViolationPolicy } from './settingService.js';
import { countHearingMessages, getHearingState, notifyHearingUpdated } from './issueHearingService.js';
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

  // Earlier penalties of each party help the admin spot repeat offenders
  const parties = { shipper: issue.shipper?._id, customer: issue.customer?._id, restaurant: issue.restaurant?.owner };
  const [groups, policy, sinceSuspension, hearingMessageCount] = await Promise.all([
    DeliveryIssue.aggregate([
      { $match: { 'resolution.penalty.targetUser': { $in: Object.values(parties).filter(Boolean) } } },
      { $group: { _id: '$resolution.penalty.targetUser', count: { $sum: 1 } } },
    ]),
    getViolationPolicy(),
    Promise.all(Object.values(parties).map((userId) => (userId ? countViolationsSinceSuspension(userId) : 0))),
    countHearingMessages(issue._id),
  ]);
  const violationCounts = Object.fromEntries(
    Object.entries(parties).map(([party, userId]) => [
      party,
      groups.find((group) => String(group._id) === String(userId))?.count || 0,
    ]),
  );
  // Lets the form warn that the next penalty suspends the account
  const autoSuspend = {
    threshold: policy.autoSuspendThreshold,
    counts: Object.fromEntries(Object.keys(parties).map((party, index) => [party, sinceSuspension[index]])),
  };
  return { ...issue, violationCounts, autoSuspend, hearingState: getHearingState(issue), hearingMessageCount };
};

/**
 * Penalties counted toward the automatic suspension: those received after the account's last suspension
 * (chosen by an admin or automatic), so an account reopened after a suspension starts again from zero.
 */
const countViolationsSinceSuspension = async (userId) => {
  const lastSuspension = await DeliveryIssue.findOne({
    'resolution.penalty.targetUser': userId,
    $or: [{ 'resolution.penalty.action': 'suspend' }, { 'resolution.penalty.autoSuspended': true }],
  })
    .sort({ 'resolution.at': -1 })
    .select('resolution.at')
    .lean();
  return DeliveryIssue.countDocuments({
    'resolution.penalty.targetUser': userId,
    ...(lastSuspension && { 'resolution.at': { $gt: lastSuspension.resolution.at } }),
  });
};

// Restaurant penalties go to the owner's account
const getPenaltyTargetUser = (issue, target) =>
  ({ shipper: issue.shipper, customer: issue.customer, restaurant: issue.restaurant.owner })[target];

const applySuspension = async (adminId, issue, target, { auto = false, threshold = 0 } = {}) => {
  if (target === 'restaurant') {
    // Same as a suspension from the restaurant page: it can still finish or refund orders it already accepted.
    // The reason is kept so that page shows why; reopening happens there too.
    const note = auto
      ? `Tự động đình chỉ: đạt ${threshold} lần vi phạm (sự cố giao hàng ${issue.code})`
      : `Xử phạt sự cố giao hàng ${issue.code}`;
    await Restaurant.updateOne(
      { _id: issue.restaurant._id },
      { status: 'suspended', statusChange: { note, by: adminId, at: new Date() } },
    );
    return;
  }
  // Shipper / customer: lock the account; an admin unlocks it in account management (UC37)
  await User.updateOne({ _id: getPenaltyTargetUser(issue, target), role: { $ne: 'admin' } }, { isActive: false });
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

// Locking a shipper who still holds an order would leave that order with nobody able to finish it.
// The order of the report is handled first, on its own (applyIssueOrderAction).
const assertShipperCanBeLocked = async (issue, penaltyRecord) => {
  const locks = penaltyRecord?.action === 'suspend' || penaltyRecord?.autoSuspended;
  if (penaltyRecord?.target !== 'shipper' || !locks) return;
  const stillHeld = await Order.exists({ shipper: issue.shipper, status: { $in: ACTIVE_STATUSES } });
  if (stillHeld) {
    const message = penaltyRecord.autoSuspended
      ? 'Lần phạt này đạt ngưỡng vi phạm nên shipper sẽ bị tự động khóa, nhưng shipper đang giữ đơn chưa giao xong. Hãy hủy hoặc trả đơn về hàng chờ ở mục "Xử lý đơn hàng" trước'
      : 'Shipper đang giữ đơn chưa giao xong. Hãy hủy hoặc trả đơn về hàng chờ ở mục "Xử lý đơn hàng" trước khi khóa tài khoản';
    throw new ApiError(409, message, [{ field: 'penalty.action', message: 'Xử lý đơn hàng trước khi khóa shipper' }]);
  }
};

const notifyIssueCancellation = async (issue, order, result, reasonNote) => {
  const code = order.orderCode || order.orderNumber;
  await sendRealtimeNotification(order.customer, {
    title: 'Đơn hàng đã bị hủy',
    message: `Đơn #${code} đã được hủy do sự cố giao hàng: ${reasonNote}.${result.isPaid ? ' Yêu cầu hoàn tiền đã được tạo.' : ''}`,
    type: 'order',
    orderId: order._id,
    link: `/orders/${order._id}`,
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
 * a penalty needs a hearing (shipper, customer, restaurant) that has ended.
 */
export const resolveDeliveryIssue = async (adminId, issueId, { decision, note, penalty = null }) => {
  const issue = await DeliveryIssue.findById(issueId).populate('restaurant', 'owner').lean();
  if (!issue) {
    throw new ApiError(404, 'Không tìm thấy báo cáo sự cố');
  }
  if (issue.status !== 'open') {
    throw new ApiError(409, 'Báo cáo sự cố đã được xử lý trước đó');
  }
  const hearingState = getHearingState(issue);
  if (penalty && hearingState !== 'closed') {
    const message =
      hearingState === 'open'
        ? 'Phiên đối chất chưa kết thúc. Hãy chờ hết hạn hoặc kết thúc phiên trước khi xử phạt'
        : 'Cần mở phiên đối chất cho shipper, khách hàng và nhà hàng trước khi xử phạt';
    throw new ApiError(409, message, [{ field: 'penalty', message }]);
  }

  const penaltyRecord = penalty && {
    target: penalty.target,
    targetUser: getPenaltyTargetUser(issue, penalty.target),
    action: penalty.action,
    fineAmount: penalty.action === 'fine' ? penalty.fineAmount : 0,
    autoSuspended: false,
  };
  // This penalty reaches the threshold: the account is suspended too, whatever action the admin picked
  const { autoSuspendThreshold: threshold } = await getViolationPolicy();
  if (penaltyRecord && penaltyRecord.action !== 'suspend' && threshold > 0) {
    const earlier = await countViolationsSinceSuspension(penaltyRecord.targetUser);
    penaltyRecord.autoSuspended = earlier + 1 >= threshold;
  }
  await assertShipperCanBeLocked(issue, penaltyRecord);

  // Dotted paths keep the order action recorded earlier
  const resolved = await DeliveryIssue.findOneAndUpdate(
    { _id: issueId, status: 'open' },
    {
      $set: {
        status: decision,
        'resolution.note': note,
        'resolution.penalty': penaltyRecord,
        'resolution.by': adminId,
        'resolution.at': new Date(),
      },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (!resolved) {
    throw new ApiError(409, 'Báo cáo vừa được xử lý bởi người khác, vui lòng tải lại');
  }

  if (penaltyRecord?.action === 'suspend' || penaltyRecord?.autoSuspended) {
    await applySuspension(adminId, issue, penaltyRecord.target, { auto: penaltyRecord.autoSuspended, threshold });
  }
  const hasOpenIssue = await DeliveryIssue.exists({ order: issue.order, status: 'open' });
  await Order.updateOne(
    { _id: issue.order },
    { $set: { deliveryIssueFlagged: Boolean(hasOpenIssue) } },
  );
  notifyHearingUpdated(issue);
  return getDeliveryIssueDetail(issueId);
};
