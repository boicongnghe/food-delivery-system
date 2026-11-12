import DeliveryIssue, { HEARING_MAX_HOURS } from '../models/DeliveryIssue.js';
import IssueMessage from '../models/IssueMessage.js';
import Restaurant from '../models/Restaurant.js';
import ApiError from '../utils/ApiError.js';
import { toPage } from '../utils/pagination.js';
import { getIo, sendRealtimeNotification } from '../socket.js';

// Hearing of a delivery issue (UC45): before a penalty, the admin opens a free chat between the shipper,
// the customer and the restaurant of the order. It ends at the deadline, when an admin closes it,
// or when the report is handled. A penalty needs a hearing that has ended.

const MESSAGE_HISTORY_LIMIT = 200;
const HOUR_MS = 60 * 60 * 1000;

const ROLE_PARTY = { shipper: 'shipper', customer: 'customer', restaurant_owner: 'restaurant' };

// Where each party joins the hearing (notification links)
const HEARING_LINKS = {
  shipper: (issueId) => `/shipper/issues?id=${issueId}`,
  customer: (issueId) => `/delivery-issues?id=${issueId}`,
  restaurant: (issueId) => `/restaurant/delivery-issues?id=${issueId}`,
};

const idOf = (value) => String(value?._id ?? value);

/** 'none' (never opened) | 'open' | 'closed' */
export const getHearingState = (issue, now = new Date()) => {
  if (!issue.hearing) return 'none';
  const ended = issue.status !== 'open' || issue.hearing.closedAt || new Date(issue.hearing.deadline) <= now;
  return ended ? 'closed' : 'open';
};

// Account of each party; the restaurant is represented by its owner. `issue.restaurant` must be populated with `owner`
const getPartyUsers = (issue) => ({
  shipper: idOf(issue.shipper),
  customer: idOf(issue.customer),
  restaurant: issue.restaurant?.owner ? idOf(issue.restaurant.owner) : null,
});

const getPartyOf = (issue, user) => {
  const party = ROLE_PARTY[user.role];
  return party && getPartyUsers(issue)[party] === idOf(user._id) ? party : null;
};

// Admins and everyone in the hearing see new messages and state changes at once
const emitToHearing = (issue, event, payload) => {
  const io = getIo();
  if (!io) return;
  const rooms = [...new Set(Object.values(getPartyUsers(issue)).filter(Boolean))].map((userId) => `user:${userId}`);
  io.to([...rooms, 'role:admin']).emit(event, payload);
};

// Pages showing the hearing reload it (opened, closed, report handled). `issue.restaurant` populated with `owner`
export const notifyHearingUpdated = (issue) => {
  if (issue.hearing) emitToHearing(issue, 'issue_hearing_updated', { issueId: String(issue._id) });
};

const loadIssue = async (issueId) => {
  const issue = await DeliveryIssue.findById(issueId)
    .populate('restaurant', 'name owner')
    .populate('shipper', 'fullName')
    .populate('customer', 'fullName')
    .lean();
  if (!issue) {
    throw new ApiError(404, 'Không tìm thấy báo cáo sự cố');
  }
  return issue;
};

/**
 * The issue and the party of the user in its hearing ('admin' for an admin).
 * Someone outside the report gets a 404, so the report does not leak.
 */
const loadIssueForUser = async (issueId, user) => {
  const issue = await loadIssue(issueId);
  if (user.role === 'admin') return { issue, party: 'admin' };
  const party = getPartyOf(issue, user);
  if (!party || !issue.hearing) {
    throw new ApiError(404, 'Không tìm thấy phiên đối chất');
  }
  return { issue, party };
};

const toMessageView = (doc) => ({
  _id: doc._id,
  issue: doc.issue,
  sender: idOf(doc.sender),
  senderName: doc.sender?.fullName || '',
  party: doc.party,
  message: doc.message,
  createdAt: doc.createdAt,
});

// What a party sees: the report and who is in the hearing, without phone numbers or violation history
const toPartyView = (issue, party) => ({
  _id: issue._id,
  code: issue.code,
  orderCode: issue.orderCode,
  type: issue.type,
  description: issue.description,
  images: issue.images,
  status: issue.status,
  createdAt: issue.createdAt,
  hearing: { openedAt: issue.hearing.openedAt, deadline: issue.hearing.deadline, closedAt: issue.hearing.closedAt },
  hearingState: getHearingState(issue),
  myParty: party,
  parties: {
    shipper: issue.shipper?.fullName || '',
    customer: issue.customer?.fullName || '',
    restaurant: issue.restaurant?.name || '',
  },
});

// ---------- Admin ----------

export const openHearing = async (adminId, issueId, { deadlineHours }) => {
  const issue = await loadIssue(issueId);
  if (issue.status !== 'open') {
    throw new ApiError(409, 'Báo cáo sự cố đã được xử lý, không thể mở đối chất');
  }
  if (getHearingState(issue) === 'open') {
    throw new ApiError(409, 'Phiên đối chất đang diễn ra');
  }
  if (!issue.restaurant?.owner) {
    throw new ApiError(409, 'Nhà hàng của đơn không còn chủ quán để tham gia đối chất');
  }

  const now = new Date();
  // Conditional on "no hearing running", so two admins never open it twice
  const opened = await DeliveryIssue.findOneAndUpdate(
    {
      _id: issueId,
      status: 'open',
      $or: [{ hearing: null }, { 'hearing.closedAt': { $ne: null } }, { 'hearing.deadline': { $lte: now } }],
    },
    {
      $set: {
        hearing: {
          openedBy: adminId,
          openedAt: now,
          deadline: new Date(now.getTime() + deadlineHours * HOUR_MS),
          closedBy: null,
          closedAt: null,
        },
      },
    },
  );
  if (!opened) {
    throw new ApiError(409, 'Báo cáo vừa thay đổi, vui lòng tải lại');
  }

  await Promise.all(
    Object.entries(getPartyUsers(issue)).map(([party, userId]) =>
      sendRealtimeNotification(userId, {
        title: `Mời đối chất sự cố ${issue.code}`,
        message: `Đơn #${issue.orderCode} có báo cáo sự cố giao hàng. Hãy vào trao đổi với các bên trong ${deadlineHours} giờ tới trước khi quản trị viên kết luận.`,
        type: 'delivery',
        orderId: issue.order,
        link: HEARING_LINKS[party](issue._id),
      }),
    ),
  );
  // `issue` was read before the hearing existed: emit directly
  emitToHearing(issue, 'issue_hearing_updated', { issueId: String(issue._id) });
};

export const closeHearing = async (adminId, issueId) => {
  const issue = await loadIssue(issueId);
  const now = new Date();
  const closed = await DeliveryIssue.findOneAndUpdate(
    { _id: issueId, status: 'open', 'hearing.closedAt': null, 'hearing.deadline': { $gt: now } },
    { $set: { 'hearing.closedAt': now, 'hearing.closedBy': adminId } },
  );
  if (!closed) {
    throw new ApiError(409, 'Phiên đối chất không còn diễn ra');
  }
  notifyHearingUpdated(issue);
};

// ---------- Parties (shipper, customer, restaurant owner) ----------

const getPartyFilter = async (user) => {
  if (user.role === 'shipper') return { shipper: user._id };
  if (user.role === 'customer') return { customer: user._id };
  const restaurantIds = await Restaurant.find({ owner: user._id }).distinct('_id');
  return { restaurant: { $in: restaurantIds } };
};

export const listMyHearings = async (user, { page, limit }) => {
  const filter = { ...(await getPartyFilter(user)), hearing: { $ne: null } };
  const [issues, totalItems] = await Promise.all([
    DeliveryIssue.find(filter)
      .select('code orderCode type status hearing restaurant createdAt')
      .populate('restaurant', 'name')
      .sort({ 'hearing.openedAt': -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DeliveryIssue.countDocuments(filter),
  ]);
  const items = issues.map((issue) => ({
    _id: issue._id,
    code: issue.code,
    orderCode: issue.orderCode,
    type: issue.type,
    status: issue.status,
    restaurantName: issue.restaurant?.name || '',
    deadline: issue.hearing.deadline,
    hearingState: getHearingState(issue),
  }));
  return toPage(items, { page, limit }, totalItems);
};

export const getHearingForParty = async (user, issueId) => {
  const { issue, party } = await loadIssueForUser(issueId, user);
  return toPartyView(issue, party);
};

// ---------- Messages (parties and admins) ----------

export const listHearingMessages = async (user, issueId) => {
  await loadIssueForUser(issueId, user);
  const messages = await IssueMessage.find({ issue: issueId })
    .sort({ createdAt: -1 })
    .limit(MESSAGE_HISTORY_LIMIT)
    .populate('sender', 'fullName')
    .lean();
  return messages.reverse().map(toMessageView);
};

export const sendHearingMessage = async (user, issueId, message) => {
  const { issue, party } = await loadIssueForUser(issueId, user);
  if (getHearingState(issue) !== 'open') {
    throw new ApiError(409, issue.hearing ? 'Phiên đối chất đã kết thúc' : 'Chưa mở phiên đối chất cho báo cáo này');
  }
  const created = await IssueMessage.create({ issue: issue._id, sender: user._id, party, message });
  const view = toMessageView({ ...created.toObject(), sender: { _id: user._id, fullName: user.fullName } });
  emitToHearing(issue, 'issue_hearing_message', view);
  return view;
};

export const countHearingMessages = (issueId) => IssueMessage.countDocuments({ issue: issueId });
