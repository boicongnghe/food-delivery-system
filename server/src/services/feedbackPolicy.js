// Shared rules for what happens after an order: reviews (UC17), complaints (UC18), delivery issues (UC34)
import ApiError from '../utils/ApiError.js';
import { getPublicIdFromUrl } from '../utils/cloudinaryUrl.js';

export const REVIEW_WINDOW_DAYS = 7;
export const COMPLAINT_WINDOW_DAYS = 7;
export const ISSUE_REPORT_WINDOW_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

export const hoursAgo = (hours) => new Date(Date.now() - hours * HOUR_MS);
export const daysAgo = (days) => hoursAgo(days * 24);

// Fields needed for the order cards of the feedback page (no address or phone)
export const FEEDBACK_ORDER_FIELDS = 'orderCode status restaurant shipper items.name items.quantity total statusHistory updatedAt';

// When the order reached its current status (delivered at, cancelled at). Old data without history: updatedAt.
export const getStatusChangedAt = (order) => {
  const entry = [...(order.statusHistory || [])].reverse().find((item) => item.status === order.status);
  return entry?.at || order.updatedAt;
};

// Orders that reached one of `statuses` after `since` (the status history keeps the real time)
export const closedSinceFilter = (statuses, since) => ({
  status: { $in: statuses },
  statusHistory: { $elemMatch: { status: { $in: statuses }, at: { $gte: since } } },
});

export const toFeedbackOrder = (order, windowDays) => {
  const closedAt = getStatusChangedAt(order);
  return {
    _id: order._id,
    orderCode: order.orderCode,
    status: order.status,
    restaurant: order.restaurant && { _id: order.restaurant._id, name: order.restaurant.name, logo: order.restaurant.logo },
    shipper: order.shipper && { _id: order.shipper._id, fullName: order.shipper.fullName },
    items: order.items.map(({ name, quantity }) => ({ name, quantity })),
    total: order.total,
    closedAt,
    deadline: new Date(new Date(closedAt).getTime() + windowDays * 24 * HOUR_MS),
  };
};

// Evidence must be photos this user uploaded to that folder: food-delivery/<folder>/<userId>/<id>
export const ensureOwnEvidence = (images, folder, userId) => {
  const isForeign = images.some((url) => {
    const [, imageFolder, ownerId] = getPublicIdFromUrl(url).split('/');
    return imageFolder !== folder || ownerId !== String(userId);
  });
  if (isForeign) {
    throw new ApiError(400, 'Dữ liệu không hợp lệ', [{ field: 'images', message: 'Ảnh minh chứng phải do bạn tải lên' }]);
  }
};

// { all, open, resolved, ... } for the status tabs of admin lists and reports
export const countByStatus = async (Model, match, statuses) => {
  const groups = await Model.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  for (const group of groups) {
    counts[group._id] = group.count;
  }
  return { all: groups.reduce((sum, group) => sum + group.count, 0), ...counts };
};
