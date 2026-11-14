import Complaint from '../models/Complaint.js';
import DeliveryIssue from '../models/DeliveryIssue.js';
import HearingMessage, { HEARING_CASE_SEGMENTS } from '../models/HearingMessage.js';
import Restaurant from '../models/Restaurant.js';
import ApiError from '../utils/ApiError.js';
import { toPage } from '../utils/pagination.js';
import { getIo, sendRealtimeNotification } from '../socket.js';

// Hearing of a case before a penalty: the admin opens a free chat between the parties of the order
// (shipper, customer, restaurant owner; a complaint may have no shipper). It ends at the deadline, when an admin
// closes it, or when the case is handled. Cases: delivery issue reports (UC45) and complaints (UC42).

const MESSAGE_HISTORY_LIMIT = 200;
const HOUR_MS = 60 * 60 * 1000;

const SEGMENT_OF = Object.fromEntries(Object.entries(HEARING_CASE_SEGMENTS).map(([segment, caseType]) => [caseType, segment]));

// caseType -> model, URL segment and wording
const CASES = {
  delivery_issue: {
    Model: DeliveryIssue,
    segment: SEGMENT_OF.delivery_issue,
    noun: 'sự cố giao hàng',
    notFound: 'Không tìm thấy báo cáo sự cố',
    reportedBy: 'shipper',
    kindField: 'type',
    notificationType: 'delivery',
    outcomes: { resolved: 'Báo cáo sự cố đã được xác nhận', dismissed: 'Báo cáo sự cố đã bị bác bỏ' },
  },
  complaint: {
    Model: Complaint,
    segment: SEGMENT_OF.complaint,
    noun: 'khiếu nại',
    notFound: 'Không tìm thấy khiếu nại',
    reportedBy: 'customer',
    kindField: 'category',
    notificationType: 'complaint',
    outcomes: { resolved: 'Khiếu nại đã được chấp nhận', rejected: 'Khiếu nại không được chấp nhận' },
  },
};

const PENALTY_ACTION_TEXT = { warning: 'cảnh cáo', fine: 'phạt tiền', suspend: 'đình chỉ hoạt động' };
// Reminder before the deadline: 2 hours ahead, or half the hearing for a shorter one
const REMINDER_LEAD_MS = 2 * HOUR_MS;
const JOB_INTERVAL_MS = 60 * 1000;

const ROLE_PARTY = { shipper: 'shipper', customer: 'customer', restaurant_owner: 'restaurant' };

// Hearing page of each portal (notification links): ?type=<segment>&id=<case id>
const HEARING_PAGES = { shipper: '/shipper/hearings', customer: '/hearings', restaurant: '/restaurant/hearings' };
const hearingLink = (party, caseType, caseId) => `${HEARING_PAGES[party]}?type=${CASES[caseType].segment}&id=${caseId}`;

const idOf = (value) => (value ? String(value._id ?? value) : null);

/** 'none' (never opened) | 'open' | 'closed' */
export const getHearingState = (caseDoc, now = new Date()) => {
  if (!caseDoc.hearing) return 'none';
  const ended = caseDoc.status !== 'open' || caseDoc.hearing.closedAt || new Date(caseDoc.hearing.deadline) <= now;
  return ended ? 'closed' : 'open';
};

// Account of each party; the restaurant is represented by its owner. `restaurant` populated with `owner`
const getPartyUsers = (caseDoc) => ({
  shipper: idOf(caseDoc.shipper),
  customer: idOf(caseDoc.customer),
  restaurant: idOf(caseDoc.restaurant?.owner),
});

const getPartyOf = (caseDoc, user) => {
  const party = ROLE_PARTY[user.role];
  return party && getPartyUsers(caseDoc)[party] === idOf(user._id) ? party : null;
};

// Admins and everyone in the hearing see new messages and state changes at once
const emitToHearing = (caseDoc, event, payload) => {
  const io = getIo();
  if (!io) return;
  const rooms = [...new Set(Object.values(getPartyUsers(caseDoc)).filter(Boolean))].map((userId) => `user:${userId}`);
  io.to([...rooms, 'role:admin']).emit(event, payload);
};

/** Pages showing the hearing reload it (opened, closed, case handled). `restaurant` populated with `owner` */
export const notifyHearingUpdated = (caseType, caseDoc) => {
  if (caseDoc.hearing) emitToHearing(caseDoc, 'hearing_updated', { caseType, caseId: String(caseDoc._id) });
};

const loadCase = async (caseType, caseId) => {
  const config = CASES[caseType];
  const caseDoc = await config.Model.findById(caseId)
    .populate('restaurant', 'name owner')
    .populate('shipper', 'fullName')
    .populate('customer', 'fullName')
    .lean();
  if (!caseDoc) {
    throw new ApiError(404, config.notFound);
  }
  return caseDoc;
};

/**
 * The case and the party of the user in its hearing ('admin' for an admin).
 * Someone outside the case gets a 404, so the case does not leak.
 */
const loadCaseForUser = async (caseType, caseId, user) => {
  const caseDoc = await loadCase(caseType, caseId);
  if (user.role === 'admin') return { caseDoc, party: 'admin' };
  const party = getPartyOf(caseDoc, user);
  if (!party || !caseDoc.hearing) {
    throw new ApiError(404, 'Không tìm thấy phiên đối chất');
  }
  return { caseDoc, party };
};

const toMessageView = (doc) => ({
  _id: doc._id,
  caseType: doc.caseType,
  caseId: doc.caseId,
  sender: idOf(doc.sender),
  senderName: doc.sender?.fullName || '',
  party: doc.party,
  message: doc.message,
  createdAt: doc.createdAt,
});

// What a party sees: the case and who is in the hearing, without phone numbers or violation history
const toPartyView = (caseType, caseDoc, party) => ({
  _id: caseDoc._id,
  caseType,
  code: caseDoc.code,
  orderCode: caseDoc.orderCode,
  kind: caseDoc[CASES[caseType].kindField], // delivery issue type / complaint category
  reportedBy: CASES[caseType].reportedBy,
  description: caseDoc.description,
  images: caseDoc.images,
  status: caseDoc.status,
  createdAt: caseDoc.createdAt,
  hearing: { openedAt: caseDoc.hearing.openedAt, deadline: caseDoc.hearing.deadline, closedAt: caseDoc.hearing.closedAt },
  hearingState: getHearingState(caseDoc),
  myParty: party,
  parties: {
    shipper: caseDoc.shipper?.fullName || null, // null: the order has no shipper
    customer: caseDoc.customer?.fullName || '',
    restaurant: caseDoc.restaurant?.name || '',
  },
});

// ---------- Admin ----------

export const openHearing = async (adminId, caseType, caseId, { deadlineHours }) => {
  const config = CASES[caseType];
  const caseDoc = await loadCase(caseType, caseId);
  if (caseDoc.status !== 'open') {
    throw new ApiError(409, `Vụ ${config.noun} đã được xử lý, không thể mở đối chất`);
  }
  if (getHearingState(caseDoc) === 'open') {
    throw new ApiError(409, 'Phiên đối chất đang diễn ra');
  }
  if (!caseDoc.restaurant?.owner) {
    throw new ApiError(409, 'Nhà hàng của đơn không còn chủ quán để tham gia đối chất');
  }

  const now = new Date();
  // Conditional on "no hearing running", so two admins never open it twice
  const opened = await config.Model.findOneAndUpdate(
    {
      _id: caseId,
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
          remindedAt: null,
        },
      },
    },
  );
  if (!opened) {
    throw new ApiError(409, 'Vụ việc vừa thay đổi, vui lòng tải lại');
  }

  const invited = Object.entries(getPartyUsers(caseDoc)).filter(([, userId]) => userId);
  await Promise.all(
    invited.map(([party, userId]) =>
      sendRealtimeNotification(userId, {
        title: `Mời đối chất ${config.noun} ${caseDoc.code}`,
        message: `Đơn #${caseDoc.orderCode} có ${config.noun} cần làm rõ. Hãy vào trao đổi với các bên trong ${deadlineHours} giờ tới trước khi quản trị viên kết luận.`,
        type: caseType === 'complaint' ? 'complaint' : 'delivery',
        orderId: caseDoc.order,
        link: hearingLink(party, caseType, caseDoc._id),
      }),
    ),
  );
  // `caseDoc` was read before the hearing existed: emit directly
  emitToHearing(caseDoc, 'hearing_updated', { caseType, caseId: String(caseDoc._id) });
};

export const closeHearing = async (adminId, caseType, caseId) => {
  const caseDoc = await loadCase(caseType, caseId);
  const now = new Date();
  const closed = await CASES[caseType].Model.findOneAndUpdate(
    { _id: caseId, status: 'open', 'hearing.closedAt': null, 'hearing.deadline': { $gt: now } },
    { $set: { 'hearing.closedAt': now, 'hearing.closedBy': adminId } },
  );
  if (!closed) {
    throw new ApiError(409, 'Phiên đối chất không còn diễn ra');
  }
  notifyHearingUpdated(caseType, caseDoc);
};

// ---------- Parties (shipper, customer, restaurant owner) ----------

const getPartyFilter = async (user) => {
  if (user.role === 'shipper') return { shipper: user._id };
  if (user.role === 'customer') return { customer: user._id };
  const restaurantIds = await Restaurant.find({ owner: user._id }).distinct('_id');
  return { restaurant: { $in: restaurantIds } };
};

/** Hearings of the user in both kinds of case, newest first */
export const listMyHearings = async (user, { page, limit }) => {
  const filter = { ...(await getPartyFilter(user)), hearing: { $ne: null } };
  const entries = Object.entries(CASES);
  // Enough of each kind to fill the requested page once merged
  const [lists, totals] = await Promise.all([
    Promise.all(
      entries.map(([, config]) =>
        config.Model.find(filter)
          .select(`code orderCode ${config.kindField} status hearing restaurant createdAt`)
          .populate('restaurant', 'name')
          .sort({ 'hearing.openedAt': -1 })
          .limit(page * limit)
          .lean(),
      ),
    ),
    Promise.all(entries.map(([, config]) => config.Model.countDocuments(filter))),
  ]);
  const items = lists
    .flatMap((docs, index) => {
      const [caseType, config] = entries[index];
      return docs.map((doc) => ({
        _id: doc._id,
        caseType,
        code: doc.code,
        orderCode: doc.orderCode,
        kind: doc[config.kindField],
        status: doc.status,
        restaurantName: doc.restaurant?.name || '',
        openedAt: doc.hearing.openedAt,
        deadline: doc.hearing.deadline,
        hearingState: getHearingState(doc),
      }));
    })
    .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))
    .slice((page - 1) * limit, page * limit);
  return toPage(items, { page, limit }, totals.reduce((sum, count) => sum + count, 0));
};

export const getHearingForParty = async (user, caseType, caseId) => {
  const { caseDoc, party } = await loadCaseForUser(caseType, caseId, user);
  return toPartyView(caseType, caseDoc, party);
};

// ---------- Messages (parties and admins) ----------

export const listHearingMessages = async (user, caseType, caseId) => {
  await loadCaseForUser(caseType, caseId, user);
  const messages = await HearingMessage.find({ caseType, caseId })
    .sort({ createdAt: -1 })
    .limit(MESSAGE_HISTORY_LIMIT)
    .populate('sender', 'fullName')
    .lean();
  return messages.reverse().map(toMessageView);
};

export const sendHearingMessage = async (user, caseType, caseId, message) => {
  const { caseDoc, party } = await loadCaseForUser(caseType, caseId, user);
  if (getHearingState(caseDoc) !== 'open') {
    throw new ApiError(409, caseDoc.hearing ? 'Phiên đối chất đã kết thúc' : 'Chưa mở phiên đối chất cho vụ việc này');
  }
  const created = await HearingMessage.create({ caseType, caseId: caseDoc._id, sender: user._id, party, message });
  const view = toMessageView({ ...created.toObject(), sender: { _id: user._id, fullName: user.fullName } });
  emitToHearing(caseDoc, 'hearing_message', view);
  return view;
};

export const countHearingMessages = (caseType, caseId) => HearingMessage.countDocuments({ caseType, caseId });

/** Reject a penalty until a hearing has ended (same rule for both kinds of case) */
export const assertHearingEndedForPenalty = (caseDoc) => {
  const state = getHearingState(caseDoc);
  if (state === 'closed') return;
  const message =
    state === 'open'
      ? 'Phiên đối chất chưa kết thúc. Hãy chờ hết hạn hoặc kết thúc phiên trước khi xử phạt'
      : 'Cần mở phiên đối chất cho các bên trước khi xử phạt';
  throw new ApiError(409, message, [{ field: 'penalty', message }]);
};

// ---------- Notifications: outcome and reminder ----------

const penaltyText = (penalty) => {
  let fine = '';
  if (penalty.action === 'fine') {
    const collected = penalty.fineCollected || 0;
    const taken =
      collected >= penalty.fineAmount
        ? ', đã trừ vào ví'
        : collected > 0
          ? `, đã trừ ${collected.toLocaleString('vi-VN')}đ vào ví (số dư không đủ)`
          : ', chưa trừ được do ví không có số dư';
    fine = ` ${penalty.fineAmount.toLocaleString('vi-VN')}đ${taken}`;
  }
  const auto = penalty.autoSuspended ? ', kèm tự động đình chỉ do đạt ngưỡng vi phạm' : '';
  return `${PENALTY_ACTION_TEXT[penalty.action]}${fine}${auto}`;
};

/**
 * Tells every party of the hearing how the admin concluded the case. Only the penalized party learns about its
 * penalty; the others get the outcome and the admin's conclusion. Nothing is sent for a case without a hearing.
 * @param {object} caseDoc - the case as read before the resolution, `restaurant` populated with `owner`
 * @param {{ status: string, note: string, penalty: object | null, refundAmount?: number }} outcome
 */
export const notifyHearingOutcome = async (caseType, caseDoc, { status, note, penalty, refundAmount = 0 }) => {
  if (!caseDoc.hearing) return;
  const config = CASES[caseType];
  const parties = Object.entries(getPartyUsers(caseDoc)).filter(([, userId]) => userId);
  await Promise.all(
    parties.map(([party, userId]) => {
      const parts = [`${config.outcomes[status]}.`];
      if (party === 'customer' && refundAmount > 0) parts.push(`Bạn được hoàn ${refundAmount.toLocaleString('vi-VN')}đ.`);
      if (penalty && idOf(penalty.targetUser) === userId) {
        parts.push(`${party === 'restaurant' ? 'Nhà hàng của bạn' : 'Bạn'} bị xử phạt: ${penaltyText(penalty)}.`);
      }
      parts.push(`Kết luận: ${note}`);
      return sendRealtimeNotification(userId, {
        title: `Kết luận ${config.noun} ${caseDoc.code}`,
        message: parts.join(' '),
        type: config.notificationType,
        orderId: caseDoc.order?._id ?? caseDoc.order,
        link: hearingLink(party, caseType, caseDoc._id),
      });
    }),
  );
};

/**
 * Reminds the parties who have not written in a running hearing that it ends soon: once per hearing, when the
 * time left drops below 2 hours (half the hearing when it is shorter). Returns the number of reminders sent.
 */
export const sendHearingReminders = async (now = new Date()) => {
  let sent = 0;
  for (const [caseType, config] of Object.entries(CASES)) {
    const due = await config.Model.find({
      status: 'open',
      'hearing.closedAt': null,
      'hearing.remindedAt': null,
      'hearing.deadline': { $gt: now },
      $expr: {
        $lte: [
          '$hearing.deadline',
          {
            $add: [
              now,
              { $min: [REMINDER_LEAD_MS, { $divide: [{ $subtract: ['$hearing.deadline', '$hearing.openedAt'] }, 2] }] },
            ],
          },
        ],
      },
    })
      .populate('restaurant', 'owner')
      .lean();

    for (const caseDoc of due) {
      // Claim the reminder first: two server processes never remind twice
      const claimed = await config.Model.updateOne(
        { _id: caseDoc._id, 'hearing.remindedAt': null, 'hearing.openedAt': caseDoc.hearing.openedAt },
        { $set: { 'hearing.remindedAt': now } },
      );
      if (!claimed.modifiedCount) continue;

      const spoke = new Set(
        await HearingMessage.distinct('party', {
          caseType,
          caseId: caseDoc._id,
          createdAt: { $gte: caseDoc.hearing.openedAt },
        }),
      );
      const minutesLeft = Math.max(1, Math.round((new Date(caseDoc.hearing.deadline) - now) / 60000));
      const timeLeft = minutesLeft >= 60 ? `${Math.round(minutesLeft / 60)} giờ` : `${minutesLeft} phút`;
      const silent = Object.entries(getPartyUsers(caseDoc)).filter(([party, userId]) => userId && !spoke.has(party));
      await Promise.all(
        silent.map(([party, userId]) =>
          sendRealtimeNotification(userId, {
            title: `Sắp hết hạn đối chất ${config.noun} ${caseDoc.code}`,
            message: `Phiên đối chất đơn #${caseDoc.orderCode} kết thúc sau khoảng ${timeLeft} và bạn chưa trình bày ý kiến. Sau hạn, quản trị viên kết luận dựa trên nội dung đã có.`,
            type: config.notificationType,
            orderId: caseDoc.order,
            link: hearingLink(party, caseType, caseDoc._id),
          }),
        ),
      );
      sent += silent.length;
    }
  }
  return sent;
};

/** Run the reminders every minute in this server process (DISABLE_ORDER_JOBS=true turns background jobs off). */
export const startHearingReminderJobs = () => {
  if (process.env.DISABLE_ORDER_JOBS === 'true') return null;
  let running = false;
  const timer = setInterval(async () => {
    if (running) return; // a slow run is never overlapped by the next one
    running = true;
    try {
      await sendHearingReminders();
    } catch (error) {
      console.error(`[hearing-reminders] failed: ${error.message}`);
    } finally {
      running = false;
    }
  }, JOB_INTERVAL_MS);
  timer.unref();
  return timer;
};
