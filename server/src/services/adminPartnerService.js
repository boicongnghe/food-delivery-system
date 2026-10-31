import DeliveryIssue from '../models/DeliveryIssue.js';
import Restaurant, { PARTNER_STATUSES } from '../models/Restaurant.js';
import Shipper from '../models/Shipper.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPage } from '../utils/pagination.js';
import { summarizeOrders } from './adminUserService.js';
import { countByStatus } from './feedbackPolicy.js';

const CITIZEN_ID_PATTERN = /^[0-9]{9,12}$/; // same rule as the register form
const PLACEHOLDER_ADDRESS = 'Đang cập nhật địa chỉ'; // set by registerUser when no address was given
const MIN_SHIPPER_AGE = 18;
const ACCOUNT_FIELDS = 'fullName email phone avatar isActive isVerified authProvider createdAt';

// Target status -> statuses it can be reached from
const TRANSITIONS = {
  approved: ['pending', 'rejected', 'suspended'], // approve a profile, or reopen a suspended partner
  rejected: ['pending'],
  suspended: ['approved'],
};
const STATUS_LABELS = { pending: 'chờ duyệt', approved: 'đang hoạt động', rejected: 'bị từ chối', suspended: 'đình chỉ' };
const ACTION_LABELS = { approved: 'duyệt', rejected: 'từ chối', suspended: 'đình chỉ' };

const isFilled = (value) => typeof value === 'string' && value.trim().length > 0;

// Age in full years on today's date, null when the date cannot be read
const getAge = (dateOfBirth) => {
  const birth = new Date(dateOfBirth);
  if (!isFilled(dateOfBirth) || Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  const hadBirthday =
    today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  return today.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1);
};

/**
 * What the register form asks for (labels as shown there). `required` items block approval;
 * the email check matters because an unverified account cannot log in yet.
 */
const restaurantChecks = (restaurant, owner) => [
  { key: 'emailVerified', label: 'Email đăng ký đã được xác thực', ok: Boolean(owner?.isVerified), required: true },
  { key: 'name', label: 'Tên thương hiệu quán ăn', ok: isFilled(restaurant.name), required: true },
  {
    key: 'address',
    label: 'Địa chỉ cụ thể của quán',
    ok: isFilled(restaurant.address) && restaurant.address !== PLACEHOLDER_ADDRESS,
    required: true,
  },
  { key: 'businessItems', label: 'Món ăn / Mặt hàng quán muốn kinh doanh', ok: isFilled(restaurant.description), required: true },
  {
    key: 'ownerCitizenId',
    label: 'Số CCCD của chủ quán (9-12 chữ số)',
    ok: CITIZEN_ID_PATTERN.test(restaurant.ownerCitizenId || ''),
    required: true,
  },
  {
    key: 'businessLicense',
    label: 'Giấy phép kinh doanh / Vệ sinh ATTP',
    ok: isFilled(restaurant.businessLicense?.fileData),
    required: true,
  },
];

const shipperChecks = (shipper, account) => {
  const age = getAge(shipper.dateOfBirth);
  return [
    { key: 'emailVerified', label: 'Email đăng ký đã được xác thực', ok: Boolean(account?.isVerified), required: true },
    {
      key: 'dateOfBirth',
      label: `Ngày tháng năm sinh (đủ ${MIN_SHIPPER_AGE} tuổi)`,
      ok: age !== null && age >= MIN_SHIPPER_AGE,
      required: true,
    },
    { key: 'citizenId', label: 'Số CCCD của tài xế (9-12 chữ số)', ok: CITIZEN_ID_PATTERN.test(shipper.citizenId || ''), required: true },
    { key: 'vehicleInfo', label: 'Thông tin loại xe & Biển số xe', ok: isFilled(shipper.vehicleInfo), required: true },
    // The register form lets a shipper add the insurance after activation
    {
      key: 'insurance',
      label: 'Bảo hiểm trách nhiệm dân sự xe máy',
      ok: Boolean(shipper.vehicleInsurance?.hasInsurance),
      required: false,
    },
  ];
};

const PARTNERS = {
  restaurant: {
    Model: Restaurant,
    accountField: 'owner',
    notFound: 'Không tìm thấy nhà hàng',
    // Uploaded files stay out of lists: a business license can weigh several MB
    listFields: 'owner name address phone logo status rating ratingCount statusChange createdAt',
    searchFields: ['name', 'address', 'phone'],
    getChecks: restaurantChecks,
    getOrderMatch: (restaurant) => ({ restaurant: restaurant._id }),
  },
  shipper: {
    Model: Shipper,
    accountField: 'user',
    notFound: 'Không tìm thấy tài xế',
    listFields: 'user fullName phone citizenId vehicleInfo status rating isOnline statusChange createdAt',
    searchFields: ['fullName', 'phone', 'citizenId', 'vehicleInfo'],
    getChecks: shipperChecks,
    getOrderMatch: (shipper) => ({ shipper: shipper.user?._id }),
  },
};

const listPartners = async (config, { page, limit, keyword, status }) => {
  const baseFilter = {};
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    // Also match the login account (name, email, phone)
    const accountIds = await User.find({ $or: [{ fullName: regex }, { email: regex }, { phone: regex }] }).distinct('_id');
    baseFilter.$or = [
      ...config.searchFields.map((field) => ({ [field]: regex })),
      { [config.accountField]: { $in: accountIds } },
    ];
  }
  const filter = status === 'all' ? baseFilter : { ...baseFilter, status };

  const [items, totalItems, counts] = await Promise.all([
    config.Model.find(filter)
      .select(config.listFields)
      .populate(config.accountField, ACCOUNT_FIELDS)
      // The approval queue is served oldest first, other tabs newest first
      .sort({ createdAt: status === 'pending' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    config.Model.countDocuments(filter),
    countByStatus(config.Model, baseFilter, PARTNER_STATUSES),
  ]);
  return { ...toPage(items, { page, limit }, totalItems), counts };
};

const getPartnerDetail = async (config, id) => {
  const partner = await config.Model.findById(id)
    .populate(config.accountField, ACCOUNT_FIELDS)
    .populate('statusChange.by', 'fullName')
    .lean();
  if (!partner) {
    throw new ApiError(404, config.notFound);
  }

  const account = partner[config.accountField];
  const [orderStats, violationCount] = await Promise.all([
    summarizeOrders(config.getOrderMatch(partner)),
    account ? DeliveryIssue.countDocuments({ 'resolution.penalty.targetUser': account._id }) : 0,
  ]);
  return { ...partner, registrationChecks: config.getChecks(partner, account), orderStats, violationCount };
};

const changePartnerStatus = async (config, adminId, id, { status, note }) => {
  const partner = await config.Model.findById(id).populate(config.accountField, 'isVerified').lean();
  if (!partner) {
    throw new ApiError(404, config.notFound);
  }
  if (!TRANSITIONS[status].includes(partner.status)) {
    throw new ApiError(409, `Không thể ${ACTION_LABELS[status]} hồ sơ đang ở trạng thái "${STATUS_LABELS[partner.status]}"`);
  }

  // Reopening a suspended partner does not re-check the profile it was approved with
  if (status === 'approved' && partner.status !== 'suspended') {
    const missing = config
      .getChecks(partner, partner[config.accountField])
      .filter((check) => check.required && !check.ok);
    if (missing.length > 0) {
      throw new ApiError(
        409,
        'Hồ sơ đăng ký chưa đủ điều kiện để duyệt',
        missing.map((check) => ({ field: check.key, message: `Thiếu hoặc chưa hợp lệ: ${check.label}` })),
      );
    }
  }

  // Conditional on the status just checked: two admins deciding at once cannot both win
  const updated = await config.Model.findOneAndUpdate(
    { _id: id, status: partner.status },
    { $set: { status, statusChange: { note, by: adminId, at: new Date() } } },
  );
  if (!updated) {
    throw new ApiError(409, 'Hồ sơ vừa được người khác cập nhật, vui lòng tải lại');
  }
  return getPartnerDetail(config, id);
};

export const listRestaurants = (query) => listPartners(PARTNERS.restaurant, query);
export const getRestaurantDetail = (id) => getPartnerDetail(PARTNERS.restaurant, id);
export const changeRestaurantStatus = (adminId, id, data) => changePartnerStatus(PARTNERS.restaurant, adminId, id, data);

export const listShippers = (query) => listPartners(PARTNERS.shipper, query);
export const getShipperDetail = (id) => getPartnerDetail(PARTNERS.shipper, id);
export const changeShipperStatus = (adminId, id, data) => changePartnerStatus(PARTNERS.shipper, adminId, id, data);
