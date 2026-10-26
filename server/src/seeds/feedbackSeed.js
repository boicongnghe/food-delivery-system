// Seed demo data for the post-delivery & admin operations module (UC17, UC18, UC37, UC40-UC45).
// Usage (from server/): npm run seed:feedback
// Needs `npm run seed:orders` first (demo restaurant, customer, shipper and admin accounts).
// REPLACES: all commission rules; the demo promotion codes below; reviews, complaints and delivery issues
// of the demo restaurant; orders created by a previous run of this script.
import 'dotenv/config';
import mongoose from 'mongoose';
import CommissionRule from '../models/CommissionRule.js';
import Complaint from '../models/Complaint.js';
import DeliveryIssue from '../models/DeliveryIssue.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import PromotionRule from '../models/PromotionRule.js';
import Restaurant from '../models/Restaurant.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { generateOrderCode, getNextSequence } from '../services/counterService.js';
import { recalculateRatings } from '../services/reviewService.js';
import { addDays, startOfTodayInVietnam, vietnamDateString } from '../utils/date.js';

const ownerEmail = process.env.OWNER_EMAIL || 'chuquan@fooddelivery.vn';
// Marks the orders of this script so a re-run replaces them (they are past orders, never on the kitchen board)
const SEED_NOTE = 'Đơn mẫu cho báo cáo thống kê';
const HISTORY_DAYS = 45;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Deterministic pseudo random numbers: every run builds the same demo data
let randomState = 20261026;
const random = () => {
  randomState = (randomState * 16807) % 2147483647;
  return randomState / 2147483647;
};
const pick = (list) => list[Math.floor(random() * list.length)];

const at = (daysAgo, hour, minute = 0) =>
  new Date(startOfTodayInVietnam().getTime() - daysAgo * DAY_MS + (hour * 60 + minute) * MINUTE_MS);
const plusMinutes = (date, minutes) => new Date(date.getTime() + minutes * MINUTE_MS);

const FALLBACK_ITEMS = [
  { name: 'Phở bò tái lăn', price: 65000 },
  { name: 'Phở gà ta', price: 55000 },
  { name: 'Quẩy giòn', price: 10000 },
  { name: 'Trà đá chanh', price: 15000 },
];

const RESTAURANT_COMMENTS = [
  'Nước dùng đậm đà, thịt mềm, sẽ ủng hộ tiếp!',
  'Đóng gói cẩn thận, đồ ăn còn nóng.',
  'Ngon nhưng hơi ít hành.',
  'Phần ăn vừa phải, giá hợp lý.',
  'Món ăn bị nguội, nước dùng hơi nhạt.',
  '',
];
const SHIPPER_COMMENTS = ['Shipper thân thiện, giao nhanh.', 'Gọi trước khi tới, rất lịch sự.', '', ''];
const RATINGS = [5, 5, 5, 5, 4, 4, 4, 3, 2, 1];

const firstDayOfNextMonth = (today) => {
  const [year, month] = today.split('-').map(Number);
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
};

const buildItems = (menuItems) => {
  const source = menuItems.length ? menuItems : FALLBACK_ITEMS;
  const count = 1 + Math.floor(random() * 3);
  return Array.from({ length: count }, () => {
    const item = pick(source);
    const quantity = 1 + Math.floor(random() * 2);
    return {
      menuItem: item._id,
      name: item.name,
      image: item.image || '',
      unitPrice: item.price,
      quantity,
      options: [],
      note: '',
      lineTotal: item.price * quantity,
    };
  });
};

const buildOrder = async ({ daysAgo, status, customer, restaurant, shipper, menuItems }) => {
  const createdAt = at(daysAgo, 10 + Math.floor(random() * 11), Math.floor(random() * 60));
  const items = buildItems(menuItems);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const type = random() < 0.3 ? 'express' : 'standard';
  const shippingFee = type === 'express' ? 25000 : 15000;
  const total = subtotal + shippingFee;
  const method = random() < 0.5 ? 'cod' : 'momo';

  const history = [{ status: 'pending', at: createdAt, byRole: 'customer' }];
  const order = {
    orderCode: await generateOrderCode(),
    customer: customer._id,
    restaurant: restaurant._id,
    shipper: null,
    items,
    subtotal,
    shippingFee,
    total,
    delivery: { recipientName: customer.fullName, phone: customer.phone, address: '12 Phố Huế, Hai Bà Trưng, Hà Nội', type },
    customerNote: SEED_NOTE,
    payment: method === 'cod' ? { method, status: 'unpaid' } : { method, status: 'paid', paidAt: createdAt },
    status,
    createdAt,
  };

  if (status === 'delivered') {
    order.acceptedAt = plusMinutes(createdAt, 3);
    order.readyAt = plusMinutes(createdAt, 18);
    order.shipper = shipper?._id || null;
    const deliveredAt = plusMinutes(createdAt, 45);
    history.push(
      { status: 'preparing', at: order.acceptedAt, byRole: 'restaurant' },
      { status: 'ready_for_pickup', at: order.readyAt, byRole: 'restaurant' },
      { status: 'delivering', at: plusMinutes(createdAt, 22), byRole: 'shipper' },
      { status: 'delivered', at: deliveredAt, byRole: 'shipper' },
    );
    order.payment = { ...order.payment, status: 'paid', paidAt: order.payment.paidAt || deliveredAt };
  } else {
    const cancelledAt = plusMinutes(createdAt, 5);
    const by = random() < 0.5 ? 'customer' : 'restaurant';
    history.push({ status: 'cancelled', at: cancelledAt, byRole: by });
    order.cancellation = { by, reason: by === 'customer' ? 'changed_mind' : 'out_of_stock', note: '', at: cancelledAt };
    order.payment =
      order.payment.status === 'paid'
        ? { ...order.payment, status: 'refunded', refundedAt: cancelledAt, refundAmount: total }
        : { ...order.payment, status: 'cancelled' };
  }

  order.statusHistory = history;
  order.updatedAt = history[history.length - 1].at;
  // timestamps: false keeps the past createdAt / updatedAt
  return new Order(order).save({ timestamps: false });
};

const seedCommissionRules = async (restaurant) => {
  const today = vietnamDateString();
  const nextMonth = firstDayOfNextMonth(today);
  await CommissionRule.deleteMany({});
  await CommissionRule.create([
    {
      name: 'Hoa hồng mặc định nhà hàng',
      target: 'restaurant',
      rate: 15,
      effectiveFrom: addDays(today, -90),
      effectiveTo: addDays(nextMonth, -1),
      note: 'Áp dụng cho mọi nhà hàng chưa có quy tắc riêng',
    },
    { name: 'Hoa hồng nhà hàng năm mới', target: 'restaurant', rate: 18, effectiveFrom: nextMonth },
    {
      name: `Ưu đãi đối tác ${restaurant.name}`,
      target: 'restaurant',
      restaurant: restaurant._id,
      rate: 12,
      effectiveFrom: addDays(today, -20),
      effectiveTo: addDays(today, 40),
    },
    { name: 'Phí nền tảng shipper', target: 'shipper', rate: 10, effectiveFrom: addDays(today, -90) },
  ]);
};

const seedPromotionRules = async () => {
  const now = Date.now();
  const days = (count) => new Date(now + count * DAY_MS);
  const promotions = [
    { code: 'CHAOBAN20', title: 'Giảm 20% cho khách mới', discountType: 'percentage', discountValue: 20, maxDiscount: 50000, minOrderValue: 100000, startDate: days(-20), endDate: days(40), usageLimit: 500, usedCount: 37 },
    { code: 'GIAM30K', title: 'Giảm 30.000đ đơn từ 150.000đ', discountType: 'fixed', discountValue: 30000, minOrderValue: 150000, startDate: days(-5), endDate: days(25), usageLimit: null, usedCount: 12 },
    { code: 'TET2027', title: 'Lì xì Tết 2027', discountType: 'percentage', discountValue: 15, maxDiscount: 40000, minOrderValue: 80000, startDate: days(30), endDate: days(60), usageLimit: 1000 },
    { code: 'HE2026', title: 'Chào hè 2026', discountType: 'fixed', discountValue: 20000, minOrderValue: 100000, startDate: days(-120), endDate: days(-60), usageLimit: 300, usedCount: 214 },
    { code: 'FLASH50', title: 'Flash sale 50%', discountType: 'percentage', discountValue: 50, maxDiscount: 30000, minOrderValue: 0, startDate: days(-3), endDate: days(4), usageLimit: 100, usedCount: 100 },
    { code: 'TAMNGUNG10', title: 'Giảm 10% (đã tạm ngưng)', discountType: 'percentage', discountValue: 10, maxDiscount: 20000, minOrderValue: 50000, startDate: days(-10), endDate: days(20), usageLimit: 200, usedCount: 4, isActive: false },
  ];
  await PromotionRule.deleteMany({ code: { $in: promotions.map((promotion) => promotion.code) } });
  await PromotionRule.create(promotions);
};

const seedReviews = async (orders, admin) => {
  let count = 0;
  for (const order of orders) {
    const deliveredAt = order.statusHistory[order.statusHistory.length - 1].at;
    const rating = pick(RATINGS);
    const review = new Review({
      order: order._id,
      orderCode: order.orderCode,
      customer: order.customer,
      restaurant: order.restaurant,
      shipper: order.shipper,
      restaurantRating: rating,
      comment: rating >= 4 ? pick(RESTAURANT_COMMENTS.slice(0, 4)) : pick(RESTAURANT_COMMENTS.slice(4)),
      shipperRating: order.shipper ? Math.max(3, pick(RATINGS)) : null,
      shipperComment: order.shipper ? pick(SHIPPER_COMMENTS) : '',
      createdAt: plusMinutes(deliveredAt, 90),
      updatedAt: plusMinutes(deliveredAt, 90),
    });
    // One violating review already hidden by an admin (UC43)
    if (count === 2) {
      review.restaurantRating = 1;
      review.comment = 'Quán lừa đảo, liên hệ 0909xxxxxx để biết thêm!!!';
      review.isHidden = true;
      review.moderation = { reason: 'personal_info', note: 'Chứa số điện thoại và từ ngữ xúc phạm', by: admin?._id || null, at: plusMinutes(deliveredAt, 300) };
    }
    await review.save({ timestamps: false });
    count += 1;
  }
  return count;
};

const seedComplaints = async (orders, admin) => {
  const scenarios = [
    { category: 'missing_item', description: 'Đơn thiếu 1 phần quẩy giòn so với hóa đơn, nhờ quán kiểm tra giúp.', status: 'open' },
    {
      category: 'food_quality',
      description: 'Nước dùng bị nguội và có vị chua, không ăn được.',
      status: 'resolved',
      resolution: { note: 'Đã xác minh với quán, hoàn 35.000đ cho phần nước dùng.', refundAmount: 35000 },
    },
    {
      category: 'late_delivery',
      description: 'Đơn giao trễ hơn 20 phút so với dự kiến.',
      status: 'rejected',
      resolution: { note: 'Đơn giao trong giờ cao điểm mưa lớn, thời gian vẫn trong mức cho phép.', refundAmount: 0 },
    },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    const order = orders[index];
    if (!order) break;
    const closedAt = order.statusHistory[order.statusHistory.length - 1].at;
    const createdAt = plusMinutes(closedAt, 120);
    const { resolution, ...data } = scenario;
    await new Complaint({
      ...data,
      code: `KN-${String(await getNextSequence('complaint')).padStart(4, '0')}`,
      order: order._id,
      orderCode: order.orderCode,
      customer: order.customer,
      restaurant: order.restaurant,
      shipper: order.shipper,
      resolution: resolution ? { ...resolution, by: admin?._id || null, at: plusMinutes(createdAt, 240) } : undefined,
      createdAt,
      updatedAt: createdAt,
    }).save({ timestamps: false });
  }
  return Math.min(scenarios.length, orders.length);
};

const seedDeliveryIssues = async (orders, admin) => {
  const scenarios = [
    { type: 'customer_unreachable', description: 'Gọi khách 5 lần không nghe máy, chờ ở cổng 15 phút.', status: 'open' },
    {
      type: 'customer_refused',
      description: 'Khách từ chối nhận hàng và không thanh toán đơn COD.',
      status: 'resolved',
      resolution: { note: 'Khách bom hàng lần đầu, nhắc nhở và ghi nhận vi phạm.', penaltyTarget: 'customer', action: 'warning' },
    },
    {
      type: 'restaurant_delay',
      description: 'Quán chuẩn bị chậm 25 phút so với giờ hẹn lấy hàng.',
      status: 'dismissed',
      resolution: { note: 'Quán đã báo trước khách về thời gian chờ, không xử phạt.' },
    },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    const order = orders[index];
    if (!order?.shipper) break;
    const createdAt = order.statusHistory[order.statusHistory.length - 2].at; // reported while delivering
    const { resolution, ...data } = scenario;
    const penalty = resolution?.penaltyTarget && {
      target: resolution.penaltyTarget,
      targetUser: order.customer,
      action: resolution.action,
      fineAmount: 0,
    };
    await new DeliveryIssue({
      ...data,
      code: `SC-${String(await getNextSequence('deliveryIssue')).padStart(4, '0')}`,
      order: order._id,
      orderCode: order.orderCode,
      shipper: order.shipper,
      restaurant: order.restaurant,
      customer: order.customer,
      resolution: resolution
        ? { note: resolution.note, penalty: penalty || null, by: admin?._id || null, at: plusMinutes(createdAt, 180) }
        : undefined,
      createdAt,
      updatedAt: createdAt,
    }).save({ timestamps: false });
  }
  return Math.min(scenarios.length, orders.length);
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const owner = await User.findOne({ email: ownerEmail, role: 'restaurant_owner' });
  const restaurant = owner && (await Restaurant.findOne({ owner: owner._id }));
  if (!restaurant) {
    throw new Error(`No restaurant for ${ownerEmail}. Run "npm run seed:menu" and "npm run seed:orders" first.`);
  }
  const regularCustomer =
    (await User.findOne({ email: 'khachhang@fooddelivery.vn', role: 'customer' })) ||
    (await User.findOne({ role: 'customer' }));
  if (!regularCustomer) {
    throw new Error('No customer account found. Run "node src/seed.js" first.');
  }
  const otherCustomer = (await User.findOne({ role: 'customer', _id: { $ne: regularCustomer._id } })) || regularCustomer;
  const shipper =
    (await User.findOne({ email: 'taixe@fooddelivery.vn', role: 'shipper' })) || (await User.findOne({ role: 'shipper' }));
  const admin =
    (await User.findOne({ email: 'admin@fooddelivery.vn', role: 'admin' })) || (await User.findOne({ role: 'admin' }));
  const menuItems = await MenuItem.find({ restaurant: restaurant._id, isDeleted: false }).select('name price image').lean();

  // ----- Clean previous demo data -----
  const restaurantScope = { restaurant: restaurant._id };
  await Promise.all([
    Review.deleteMany(restaurantScope),
    Complaint.deleteMany(restaurantScope),
    DeliveryIssue.deleteMany(restaurantScope),
    Order.deleteMany({ ...restaurantScope, customerNote: SEED_NOTE }),
  ]);

  // ----- Orders for the analytics report: 1-3 per day, none today (the kitchen board counts today) -----
  const context = { restaurant, shipper, menuItems };
  const orders = [];
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo -= 1) {
    const perDay = 1 + Math.floor(random() * 3);
    for (let index = 0; index < perDay; index += 1) {
      const customer = random() < 0.6 ? regularCustomer : otherCustomer;
      const status = random() < 0.88 ? 'delivered' : 'cancelled';
      orders.push(await buildOrder({ ...context, daysAgo, status, customer }));
    }
  }

  // Newest first. The 3 newest delivered orders of the demo customer stay unreviewed ("Chờ đánh giá" tab).
  const newestFirst = [...orders].sort((a, b) => b.createdAt - a.createdAt);
  const delivered = newestFirst.filter((order) => order.status === 'delivered');
  const pendingReview = delivered
    .filter((order) => String(order.customer) === String(regularCustomer._id))
    .slice(0, 3)
    .map((order) => String(order._id));
  const reviewCount = await seedReviews(
    delivered.filter((order) => !pendingReview.includes(String(order._id)) && random() < 0.7),
    admin,
  );

  // Complaints on recent orders of the demo customer (inside the 7-day window), issues on recent delivered ones
  const recentOfCustomer = newestFirst.filter(
    (order) => String(order.customer) === String(regularCustomer._id) && order.createdAt >= at(6, 0),
  );
  const complaintCount = await seedComplaints(recentOfCustomer, admin);
  const issueCount = await seedDeliveryIssues(delivered.slice(3), admin);

  await seedCommissionRules(restaurant);
  await seedPromotionRules();
  await recalculateRatings({ restaurant: restaurant._id, shipper: shipper?._id });

  console.log(
    `Seeded ${orders.length} past orders, ${reviewCount} reviews, ${complaintCount} complaints, ` +
      `${issueCount} delivery issues, 4 commission rules and 6 promotion codes for ${restaurant.name}`,
  );
};

run()
  .catch((error) => {
    console.error(`Feedback seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
