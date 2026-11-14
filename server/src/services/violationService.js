import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import DeliveryIssue from '../models/DeliveryIssue.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { SHIPPER_ACTIVE_STATUSES } from './orderAssignmentService.js';
import { getViolationPolicy } from './settingService.js';
import { deductShipperFine } from './shipperWalletService.js';
import { deductCustomerFine, deductRestaurantFine } from './walletService.js';

// Penalties of the platform. Two kinds of case can penalize a party once its hearing has ended:
// delivery issue reports (UC45) and complaints (UC42). Both store `resolution.penalty` the same way, so one
// violation history and one automatic suspension threshold cover them.

const CASE_MODELS = [
  { caseType: 'delivery_issue', Model: DeliveryIssue, kindField: 'type' },
  { caseType: 'complaint', Model: Complaint, kindField: 'category' },
];

const idOf = (value) => (value ? String(value._id ?? value) : null);

/**
 * Account of each party of a case; the restaurant is represented by its owner.
 * `caseDoc.restaurant` must be populated with `owner`. A complaint may have no shipper (null).
 */
export const getCaseParties = (caseDoc) => ({
  shipper: idOf(caseDoc.shipper),
  customer: idOf(caseDoc.customer),
  restaurant: idOf(caseDoc.restaurant?.owner),
});

/** Total penalties received by each account: Map userId -> count */
export const countViolations = async (userIds) => {
  const ids = userIds.filter(Boolean);
  const counts = new Map(ids.map((id) => [String(id), 0]));
  if (ids.length === 0) return counts;
  const groups = await Promise.all(
    CASE_MODELS.map(({ Model }) =>
      Model.aggregate([
        { $match: { 'resolution.penalty.targetUser': { $in: ids.map((id) => new mongoose.Types.ObjectId(String(id))) } } },
        { $group: { _id: '$resolution.penalty.targetUser', count: { $sum: 1 } } },
      ]),
    ),
  );
  for (const group of groups.flat()) {
    counts.set(String(group._id), (counts.get(String(group._id)) || 0) + group.count);
  }
  return counts;
};

/**
 * Penalties counted toward the automatic suspension: those received after the account's last suspension
 * (chosen by an admin or automatic, from either kind of case), so a reopened account starts again from zero.
 */
export const countViolationsSinceSuspension = async (userId) => {
  const suspensions = await Promise.all(
    CASE_MODELS.map(({ Model }) =>
      Model.findOne({
        'resolution.penalty.targetUser': userId,
        $or: [{ 'resolution.penalty.action': 'suspend' }, { 'resolution.penalty.autoSuspended': true }],
      })
        .sort({ 'resolution.at': -1 })
        .select('resolution.at')
        .lean(),
    ),
  );
  const lastAt = suspensions
    .filter(Boolean)
    .map((doc) => doc.resolution.at)
    .sort((a, b) => b - a)[0];
  const counts = await Promise.all(
    CASE_MODELS.map(({ Model }) =>
      Model.countDocuments({
        'resolution.penalty.targetUser': userId,
        ...(lastAt && { 'resolution.at': { $gt: lastAt } }),
      }),
    ),
  );
  return counts.reduce((sum, count) => sum + count, 0);
};

/**
 * For the admin detail of a case: earlier penalties of each party (repeat offenders) and how close each one is
 * to the automatic suspension, so the form can warn that the next penalty suspends the account.
 */
export const getViolationSummary = async (caseDoc) => {
  const parties = getCaseParties(caseDoc);
  const [totals, policy, sinceSuspension] = await Promise.all([
    countViolations(Object.values(parties)),
    getViolationPolicy(),
    Promise.all(Object.values(parties).map((userId) => (userId ? countViolationsSinceSuspension(userId) : 0))),
  ]);
  return {
    violationCounts: Object.fromEntries(Object.entries(parties).map(([party, userId]) => [party, totals.get(userId) || 0])),
    autoSuspend: {
      threshold: policy.autoSuspendThreshold,
      counts: Object.fromEntries(Object.keys(parties).map((party, index) => [party, sinceSuspension[index]])),
    },
  };
};

/** Latest penalties of an account across delivery issues and complaints, newest first */
export const listViolations = async (userId, limit = 10) => {
  const filter = { 'resolution.penalty.targetUser': userId };
  const [totals, ...lists] = await Promise.all([
    Promise.all(CASE_MODELS.map(({ Model }) => Model.countDocuments(filter))),
    ...CASE_MODELS.map(({ Model, kindField }) =>
      Model.find(filter)
        .select(`code orderCode ${kindField} resolution.penalty resolution.note resolution.at`)
        .sort({ 'resolution.at': -1 })
        .limit(limit)
        .lean(),
    ),
  ]);
  const items = lists
    .flatMap((docs, index) => docs.map((doc) => ({ ...doc, caseType: CASE_MODELS[index].caseType })))
    .sort((a, b) => new Date(b.resolution.at) - new Date(a.resolution.at))
    .slice(0, limit);
  return { total: totals.reduce((sum, count) => sum + count, 0), items };
};

/**
 * Penalty to store on the case, or null. A penalty that brings the account to the threshold suspends it too,
 * whatever action the admin picked (`autoSuspended`).
 */
export const buildPenaltyRecord = async (caseDoc, penalty) => {
  const { autoSuspendThreshold: threshold } = await getViolationPolicy();
  if (!penalty) return { record: null, threshold };
  const targetUser = getCaseParties(caseDoc)[penalty.target];
  if (!targetUser) {
    throw new ApiError(400, 'Dữ liệu không hợp lệ', [
      { field: 'penalty.target', message: 'Đơn hàng không có shipper để xử phạt' },
    ]);
  }
  const record = {
    target: penalty.target,
    targetUser,
    action: penalty.action,
    fineAmount: penalty.action === 'fine' ? penalty.fineAmount : 0,
    fineCollected: 0, // set by collectFine when the case is saved
    autoSuspended: false,
  };
  if (record.action !== 'suspend' && threshold > 0) {
    record.autoSuspended = (await countViolationsSinceSuspension(targetUser)) + 1 >= threshold;
  }
  return { record, threshold };
};

const locksAccount = (record) => record?.action === 'suspend' || record?.autoSuspended;

// Locking a shipper who still holds an order would leave that order with nobody able to finish it
export const assertShipperCanBeLocked = async (record, howToFree) => {
  if (record?.target !== 'shipper' || !locksAccount(record)) return;
  const stillHeld = await Order.exists({ shipper: record.targetUser, status: { $in: SHIPPER_ACTIVE_STATUSES } });
  if (stillHeld) {
    const message = record.autoSuspended
      ? `Lần phạt này đạt ngưỡng vi phạm nên shipper sẽ bị tự động khóa, nhưng shipper đang giữ đơn chưa giao xong. ${howToFree}`
      : `Shipper đang giữ đơn chưa giao xong. ${howToFree}`;
    throw new ApiError(409, message, [{ field: 'penalty.action', message: 'Shipper đang giữ đơn chưa giao xong' }]);
  }
};

/**
 * Suspension picked by the admin or reached automatically. Restaurant: "suspended" (can still finish or refund
 * the orders it already accepted; reopened from the restaurant page, which shows the reason).
 * Shipper / customer: account locked, unlocked in account management (UC37).
 * @param {string} caseLabel - e.g. "sự cố giao hàng SC-0001", "khiếu nại KN-0001"
 */
export const applySuspension = async (adminId, caseDoc, record, { threshold, caseLabel }) => {
  if (!locksAccount(record)) return;
  if (record.target === 'restaurant') {
    const note = record.autoSuspended
      ? `Tự động đình chỉ: đạt ${threshold} lần vi phạm (${caseLabel})`
      : `Xử phạt ${caseLabel}`;
    await Restaurant.updateOne(
      { _id: caseDoc.restaurant._id },
      { status: 'suspended', statusChange: { note, by: adminId, at: new Date() } },
    );
    return;
  }
  await User.updateOne({ _id: record.targetUser, role: { $ne: 'admin' } }, { isActive: false });
};

/**
 * Takes the fine of a penalty from the wallet of the penalized party, inside the transaction that saves the case:
 * customer -> virtual wallet, shipper -> shipper wallet, restaurant -> restaurant wallet (lowers the available
 * balance). Never more than the balance: the part that could not be taken is not owed later.
 * Sets `record.fineCollected`. Returns the new customer balance to emit after the commit (null otherwise).
 * @param {object} caseDoc - `restaurant` populated with `owner`
 * @param {string} caseLabel - e.g. "khiếu nại KN-0001"
 */
export const collectFine = async (caseDoc, record, { caseLabel, session }) => {
  if (record) record.fineCollected = 0;
  if (record?.action !== 'fine' || !(record.fineAmount > 0)) return { customerBalance: null };

  const orderId = caseDoc.order?._id ?? caseDoc.order;
  const description = `Phạt ${caseLabel} (đơn #${caseDoc.orderCode})`;
  if (record.target === 'customer') {
    const { collected, balance } = await deductCustomerFine({
      userId: record.targetUser,
      amount: record.fineAmount,
      orderId,
      description,
      session,
    });
    record.fineCollected = collected;
    return { customerBalance: balance };
  }
  const { collected } =
    record.target === 'shipper'
      ? await deductShipperFine({ shipperId: record.targetUser, amount: record.fineAmount, orderId, description, session })
      : await deductRestaurantFine({ restaurantId: caseDoc.restaurant._id, amount: record.fineAmount, session });
  record.fineCollected = collected;
  return { customerBalance: null };
};
