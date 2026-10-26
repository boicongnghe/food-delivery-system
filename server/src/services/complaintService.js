import Complaint, { COMPLAINT_STATUSES } from '../models/Complaint.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';
import { getNextSequence } from './counterService.js';
import {
  COMPLAINT_WINDOW_DAYS,
  FEEDBACK_ORDER_FIELDS,
  closedSinceFilter,
  countByStatus,
  daysAgo,
  ensureOwnEvidence,
  getStatusChangedAt,
  toFeedbackOrder,
} from './feedbackPolicy.js';

const COMPLAINABLE_STATUSES = ['delivered', 'cancelled'];

// KN-0001, KN-0002, ...
const generateComplaintCode = async () => `KN-${String(await getNextSequence('complaint')).padStart(4, '0')}`;

// Compensation can never exceed what the customer actually paid minus earlier refunds
const getRefundableAmount = (order) => {
  const paid = ['paid', 'refunded'].includes(order.payment?.status) ? order.total : 0;
  return Math.max(0, paid - (order.payment?.refundAmount || 0));
};

// ---------- Customer (UC18) ----------

export const createComplaint = async (customerId, orderId, { category, description, images }) => {
  const order = await Order.findOne({ _id: orderId, customer: customerId })
    .select('orderCode status restaurant shipper statusHistory updatedAt')
    .lean();
  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }
  if (!COMPLAINABLE_STATUSES.includes(order.status)) {
    throw new ApiError(409, 'Chỉ có thể khiếu nại đơn hàng đã giao hoặc đã hủy');
  }
  if (getStatusChangedAt(order) < daysAgo(COMPLAINT_WINDOW_DAYS)) {
    throw new ApiError(409, `Đã quá hạn khiếu nại (trong ${COMPLAINT_WINDOW_DAYS} ngày kể từ khi đơn kết thúc)`);
  }
  if (await Complaint.exists({ order: order._id })) {
    throw new ApiError(409, 'Đơn hàng này đã có khiếu nại');
  }
  ensureOwnEvidence(images, 'complaints', customerId);

  return Complaint.create({
    code: await generateComplaintCode(),
    order: order._id,
    orderCode: order.orderCode,
    customer: customerId,
    restaurant: order.restaurant,
    shipper: order.shipper,
    category,
    description,
    images,
  });
};

export const listMyComplaints = async (customerId, { page, limit }) => {
  const filter = { customer: customerId };
  const [items, totalItems] = await Promise.all([
    Complaint.find(filter)
      .populate('restaurant', 'name logo')
      .select('-resolution.by')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
  ]);
  return toPage(items, { page, limit }, totalItems);
};

// Delivered / cancelled orders that can still get a complaint (newest first)
export const listComplainableOrders = async (customerId) => {
  const orders = await Order.find({
    customer: customerId,
    ...closedSinceFilter(COMPLAINABLE_STATUSES, daysAgo(COMPLAINT_WINDOW_DAYS)),
  })
    .populate('restaurant', 'name logo')
    .populate('shipper', 'fullName')
    .select(FEEDBACK_ORDER_FIELDS)
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  const complainedIds = new Set(
    (await Complaint.find({ order: { $in: orders.map((order) => order._id) } }).distinct('order')).map(String),
  );
  return {
    windowDays: COMPLAINT_WINDOW_DAYS,
    items: orders
      .filter((order) => !complainedIds.has(String(order._id)))
      .map((order) => toFeedbackOrder(order, COMPLAINT_WINDOW_DAYS)),
  };
};

// ---------- Admin (UC42) ----------

export const listComplaints = async ({ page, limit, keyword, status, category }) => {
  const baseFilter = {};
  if (category !== 'all') baseFilter.category = category;
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    baseFilter.$or = [{ code: regex }, { orderCode: regex }];
  }
  const filter = status === 'all' ? baseFilter : { ...baseFilter, status };

  const [items, totalItems, counts] = await Promise.all([
    Complaint.find(filter)
      .populate('customer', 'fullName email')
      .populate('restaurant', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
    countByStatus(Complaint, baseFilter, COMPLAINT_STATUSES),
  ]);
  return { ...toPage(items, { page, limit }, totalItems), counts };
};

export const getComplaintDetail = async (complaintId) => {
  const complaint = await Complaint.findById(complaintId)
    .populate('customer', 'fullName email phone avatar isActive')
    .populate('restaurant', 'name phone address status')
    .populate('shipper', 'fullName phone')
    .populate(
      'order',
      'orderCode items subtotal packagingFee shippingFee discount total delivery payment status statusHistory cancellation createdAt',
    )
    .populate('resolution.by', 'fullName')
    .lean();
  if (!complaint) {
    throw new ApiError(404, 'Không tìm thấy khiếu nại');
  }
  return { ...complaint, maxRefund: getRefundableAmount(complaint.order) };
};

export const resolveComplaint = async (adminId, complaintId, { decision, note, refundAmount = 0 }) => {
  const complaint = await Complaint.findById(complaintId).populate('order', 'total payment').lean();
  if (!complaint) {
    throw new ApiError(404, 'Không tìm thấy khiếu nại');
  }
  if (complaint.status !== 'open') {
    throw new ApiError(409, 'Khiếu nại đã được xử lý trước đó');
  }
  const maxRefund = getRefundableAmount(complaint.order);
  if (refundAmount > maxRefund) {
    throw new ApiError(400, 'Dữ liệu không hợp lệ', [
      { field: 'refundAmount', message: `Số tiền hoàn tối đa ${maxRefund.toLocaleString('vi-VN')}đ` },
    ]);
  }

  // Only an open complaint can be resolved: two admins answering at once cannot both win
  const resolved = await Complaint.findOneAndUpdate(
    { _id: complaintId, status: 'open' },
    { $set: { status: decision, resolution: { note, refundAmount, by: adminId, at: new Date() } } },
    { returnDocument: 'after', runValidators: true },
  );
  if (!resolved) {
    throw new ApiError(409, 'Khiếu nại vừa được xử lý bởi người khác, vui lòng tải lại');
  }
  return getComplaintDetail(complaintId);
};
