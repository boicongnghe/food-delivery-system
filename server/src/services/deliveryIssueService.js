import DeliveryIssue, { DELIVERY_ISSUE_STATUSES } from '../models/DeliveryIssue.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';
import { getNextSequence } from './counterService.js';
import {
  ISSUE_REPORT_WINDOW_HOURS,
  countByStatus,
  ensureOwnEvidence,
  getStatusChangedAt,
  hoursAgo,
} from './feedbackPolicy.js';

const DELIVERING_STATUSES = ['ready_for_pickup', 'delivering'];
const CLOSED_STATUSES = ['delivered', 'cancelled'];

// SC-0001, SC-0002, ...
const generateIssueCode = async () => `SC-${String(await getNextSequence('deliveryIssue')).padStart(4, '0')}`;

// ---------- Shipper (UC34 - API only, the shipper screen belongs to the shipper module) ----------

export const createDeliveryIssue = async (shipperId, orderId, { type, description, images }) => {
  const order = await Order.findOne({ _id: orderId, shipper: shipperId })
    .select('orderCode status restaurant customer statusHistory updatedAt')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng bạn nhận giao');
  }
  const canReport =
    DELIVERING_STATUSES.includes(order.status) ||
    (CLOSED_STATUSES.includes(order.status) && getStatusChangedAt(order) >= hoursAgo(ISSUE_REPORT_WINDOW_HOURS));
  if (!canReport) {
    throw new ApiError(
      409,
      `Chỉ báo cáo sự cố khi đang giao hoặc trong ${ISSUE_REPORT_WINDOW_HOURS} giờ sau khi đơn kết thúc`,
    );
  }
  if (await DeliveryIssue.exists({ order: order._id, status: 'open' })) {
    throw new ApiError(409, 'Đơn hàng đã có báo cáo sự cố đang chờ xử lý');
  }
  ensureOwnEvidence(images, 'delivery-issues', shipperId);

  return DeliveryIssue.create({
    code: await generateIssueCode(),
    order: order._id,
    orderCode: order.orderCode,
    shipper: shipperId,
    restaurant: order.restaurant,
    customer: order.customer,
    type,
    description,
    images,
  });
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
  return { ...toPage(items, { page, limit }, totalItems), counts };
};

export const getDeliveryIssueDetail = async (issueId) => {
  const issue = await DeliveryIssue.findById(issueId)
    .populate('shipper', 'fullName phone email isActive')
    .populate('customer', 'fullName phone email isActive')
    .populate('restaurant', 'name phone address status owner')
    .populate('order', 'orderCode items subtotal shippingFee total delivery payment status statusHistory createdAt')
    .populate('resolution.by', 'fullName')
    .lean();
  if (!issue) {
    throw new ApiError(404, 'Không tìm thấy báo cáo sự cố');
  }

  // Earlier penalties of each party help the admin spot repeat offenders
  const parties = { shipper: issue.shipper?._id, customer: issue.customer?._id, restaurant: issue.restaurant?.owner };
  const groups = await DeliveryIssue.aggregate([
    { $match: { 'resolution.penalty.targetUser': { $in: Object.values(parties).filter(Boolean) } } },
    { $group: { _id: '$resolution.penalty.targetUser', count: { $sum: 1 } } },
  ]);
  const violationCounts = Object.fromEntries(
    Object.entries(parties).map(([party, userId]) => [
      party,
      groups.find((group) => String(group._id) === String(userId))?.count || 0,
    ]),
  );
  return { ...issue, violationCounts };
};

// Restaurant penalties go to the owner's account
const getPenaltyTargetUser = (issue, target) =>
  ({ shipper: issue.shipper, customer: issue.customer, restaurant: issue.restaurant.owner })[target];

const applySuspension = async (issue, target) => {
  if (target === 'restaurant') {
    // Same as an admin suspension: the restaurant can still finish or refund orders it already accepted
    await Restaurant.updateOne({ _id: issue.restaurant._id }, { status: 'suspended' });
    return;
  }
  // Shipper / customer: lock the account; an admin unlocks it in account management (UC37)
  await User.updateOne({ _id: getPenaltyTargetUser(issue, target), role: { $ne: 'admin' } }, { isActive: false });
};

export const resolveDeliveryIssue = async (adminId, issueId, { decision, note, penalty = null }) => {
  const issue = await DeliveryIssue.findById(issueId).populate('restaurant', 'owner').lean();
  if (!issue) {
    throw new ApiError(404, 'Không tìm thấy báo cáo sự cố');
  }
  if (issue.status !== 'open') {
    throw new ApiError(409, 'Báo cáo sự cố đã được xử lý trước đó');
  }

  const penaltyRecord = penalty && {
    target: penalty.target,
    targetUser: getPenaltyTargetUser(issue, penalty.target),
    action: penalty.action,
    fineAmount: penalty.action === 'fine' ? penalty.fineAmount : 0,
  };
  const resolved = await DeliveryIssue.findOneAndUpdate(
    { _id: issueId, status: 'open' },
    { $set: { status: decision, resolution: { note, penalty: penaltyRecord, by: adminId, at: new Date() } } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!resolved) {
    throw new ApiError(409, 'Báo cáo vừa được xử lý bởi người khác, vui lòng tải lại');
  }

  if (penaltyRecord?.action === 'suspend') {
    await applySuspension(issue, penaltyRecord.target);
  }
  return getDeliveryIssueDetail(issueId);
};
