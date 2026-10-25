import 'dotenv/config';
import mongoose from 'mongoose';
import DriverDashboard from '../models/DriverDashboard.js';
import User from '../models/User.js';

const DEFAULT_DRIVER_EMAIL = 'taixe@fooddelivery.vn';
const TRIP_DETAILS = [
  { restaurant: 'Cơm Văn Phòng Hòa Lạc · DEMO', address: 'Khu Công nghệ cao Hòa Lạc, Thạch Thất', distance: 1.2 },
  { restaurant: 'Bún Chả Cổng FPT · DEMO', address: 'Đại học FPT, Hòa Lạc, Thạch Thất', distance: 0.8 },
  { restaurant: 'Trà & Ăn Vặt Hòa Lạc · DEMO', address: 'Đường vào Đại học FPT, Hòa Lạc', distance: 1.4 },
  { restaurant: 'Cơm Gà Hòa Lạc · DEMO', address: 'Khu dịch vụ Hòa Lạc, Thạch Thất', distance: 2.1 },
  { restaurant: 'Bánh Mì Sinh Viên · DEMO', address: 'Khu vực cổng Đại học FPT Hòa Lạc', distance: 0.6 },
  { restaurant: 'Phở Hòa Lạc · DEMO', address: 'Quốc lộ 21, khu vực Hòa Lạc', distance: 3.2 },
  { restaurant: 'Đồ Ăn Nhanh Thạch Thất · DEMO', address: 'Thị trấn Liên Quan, Thạch Thất', distance: 4.8 },
  { restaurant: 'Quán Ăn Tân Xã · DEMO', address: 'Xã Tân Xã, khu vực Hòa Lạc', distance: 2.7 },
];
const TRIP_TIMES = ['08:15', '09:30', '11:45', '13:10', '17:25', '19:40', '20:15', '21:05'];
const HOURLY_FORECAST = [
  { hour: '17:00', demand: 68 },
  { hour: '18:00', demand: 86 },
  { hour: '19:00', demand: 74 },
];
const REVIEWS = [
  { quote: 'Giao hàng nhanh và đồ ăn vẫn còn nóng, cảm ơn bạn!', customer: 'DEMO · Minh T.', stars: 5 },
  { quote: 'Tài xế lịch sự, gọi trước khi đến. Trải nghiệm rất tốt.', customer: 'DEMO · Lan A.', stars: 5 },
  { quote: 'Đơn hàng được giao đầy đủ, đúng địa chỉ.', customer: 'DEMO · Hoàng N.', stars: 4 },
  { quote: 'Bạn tài xế nhiệt tình và giao đúng giờ.', customer: 'DEMO · Phương L.', stars: 5 },
  { quote: 'Thái độ thân thiện, quá trình giao hàng thuận tiện.', customer: 'DEMO · Ngọc V.', stars: 5 },
];
const BADGES = [
  { id: 'punctual', icon: '⏰', label: 'Giao đúng giờ' },
  { id: 'friendly', icon: '😊', label: 'Thân thiện' },
  { id: 'careful', icon: '🛡️', label: 'Giao hàng cẩn thận' },
];
const MISSIONS = [
  { id: 'daily-trip-goal', title: 'Hoàn thành 10 chuyến trong ngày', reward: 50000, target: 10 },
  { id: 'daily-surge-trip', title: 'Hoàn thành 3 chuyến giờ cao điểm', reward: 30000, target: 3 },
  { id: 'daily-five-star', title: 'Nhận 5 đánh giá 5 sao', reward: 20000, target: 5 },
];
const PERIOD_CONFIG = {
  today: { tripCount: 6, tripGoal: 10, ratingCount: 3, badgeMultiplier: 1 },
  week: { tripCount: 18, tripGoal: 80, ratingCount: 4, badgeMultiplier: 4 },
  month: { tripCount: 45, tripGoal: 300, ratingCount: 5, badgeMultiplier: 12 },
};
const HOTSPOTS = [
  {
    id: 'demo-hotspot-fpt-campus',
    name: 'Đại học FPT Hòa Lạc',
    district: 'Khu Công nghệ cao Hòa Lạc',
    level: 'hot',
    demand: 91,
    orders: 'Nhu cầu cao quanh khuôn viên · DEMO',
    pin: { top: '34%', left: '52%' },
    zone: { top: '26%', left: '45%', width: 88, height: 70 },
  },
  {
    id: 'demo-hotspot-fpt-gate',
    name: 'Khu dịch vụ cổng FPT',
    district: 'Hòa Lạc',
    level: 'med',
    demand: 74,
    orders: 'Nhu cầu trung bình · DEMO',
    pin: { top: '48%', left: '69%' },
    zone: { top: '41%', left: '62%', width: 78, height: 64 },
  },
  {
    id: 'demo-hotspot-tan-xa',
    name: 'Tân Xã',
    district: 'Thạch Thất',
    level: 'hot',
    demand: 79,
    orders: 'Nhu cầu cao quanh khu dân cư · DEMO',
    pin: { top: '61%', left: '34%' },
    zone: { top: '54%', left: '27%', width: 80, height: 68 },
  },
  {
    id: 'demo-hotspot-lien-quan',
    name: 'Liên Quan',
    district: 'Thạch Thất',
    level: 'low',
    demand: 48,
    orders: 'Nhu cầu thấp · DEMO',
    pin: { top: '76%', left: '55%' },
    zone: { top: '68%', left: '48%', width: 76, height: 62 },
  },
];

const createTrips = (period, count) => Array.from({ length: count }, (_, index) => {
  const detail = TRIP_DETAILS[index % TRIP_DETAILS.length];
  const hour = TRIP_TIMES[index % TRIP_TIMES.length];

  return {
    id: `DEMO-${period.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
    time: hour,
    restaurant: detail.restaurant,
    address: detail.address,
    distance: `${detail.distance.toFixed(1)} km`,
    baseFare: 24000 + (index % 4) * 3000,
    bonus: index % 3 === 0 ? 6000 : index % 4 === 0 ? 10000 : 0,
    tip: index % 3 === 1 ? 5000 : 0,
    status: 'Đã giao · DEMO',
    surge: index % 4 === 0,
  };
});

const createEarningsByHour = trips => {
  const earningsByHour = new Map();

  trips.forEach(trip => {
    const totals = earningsByHour.get(trip.time) || { hour: trip.time, base: 0, bonus: 0, tip: 0, surge: false };
    totals.base += trip.baseFare;
    totals.bonus += trip.bonus;
    totals.tip += trip.tip;
    totals.surge ||= trip.surge;
    earningsByHour.set(trip.time, totals);
  });

  return [...earningsByHour.values()];
};

const createMissions = completedTrips => MISSIONS.map((mission, index) => {
  const current = index === 0
    ? Math.min(completedTrips, mission.target)
    : index === 1
      ? Math.min(Math.floor(completedTrips / 3), mission.target)
      : Math.min(Math.floor(completedTrips / 4), mission.target);

  return {
    ...mission,
    id: `demo-${mission.id}`,
    current,
    status: current >= mission.target ? 'completed' : 'active',
  };
});

const createPeriodData = (period, config) => {
  const trips = createTrips(period, config.tripCount);
  const totals = trips.reduce((sum, trip) => ({
    baseFare: sum.baseFare + trip.baseFare,
    bonus: sum.bonus + trip.bonus,
    tips: sum.tips + trip.tip,
  }), { baseFare: 0, bonus: 0, tips: 0 });
  const reviews = REVIEWS.slice(0, config.ratingCount).map((review, index) => ({
    id: `demo-${period}-review-${index + 1}`,
    ...review,
    isDemo: true,
  }));

  return {
    totalEarnings: totals.baseFare + totals.bonus + totals.tips,
    ...totals,
    completedTrips: trips.length,
    tripGoal: config.tripGoal,
    walletBalance: 185000 + trips.length * 18000,
    pendingBalance: 32000 + trips.length * 4000,
    weeklyEarnings: 0,
    rating: Number((reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length).toFixed(2)),
    tier: 'Đối tác Bạc · DEMO',
    ratingCount: reviews.length,
    consecutiveFiveStarTrips: Math.max(0, reviews.filter(review => review.stars === 5).length - 1),
    payoutBank: 'Chưa liên kết · DEMO',
    earningsByHour: createEarningsByHour(trips),
    forecast: HOURLY_FORECAST,
    trips,
    missions: createMissions(trips.length),
    reviews,
    badges: BADGES.map((badge, index) => ({
      id: `demo-${period}-badge-${index + 1}`,
      ...badge,
      count: config.badgeMultiplier * (index + 2),
      isDemo: true,
    })),
    hotspots: HOTSPOTS,
  };
};

const hasExistingNonDemoData = dashboard => Object.values(dashboard.periods || {}).some(period => (
  period && (
    period.totalEarnings > 0
    || period.baseFare > 0
    || period.bonus > 0
    || period.tips > 0
    || period.completedTrips > 0
    || period.trips?.length > 0
    || period.missions?.length > 0
    || period.earningsByHour?.length > 0
    || period.forecast?.length > 0
    || period.hotspots?.length > 0
    || period.reviews?.some(review => !review.isDemo)
    || period.badges?.some(badge => !badge.isDemo)
  )
));

const seedDriverDashboardDemo = async () => {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Set NODE_ENV=development to run the demo dashboard seed.');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Configure server/.env before seeding.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const requestedEmail = process.env.DRIVER_DEMO_EMAIL?.trim().toLowerCase();
  let driver = await User.findOne({
    email: requestedEmail || DEFAULT_DRIVER_EMAIL,
    role: 'shipper',
  });

  if (!driver && !requestedEmail) {
    const shippers = await User.find({ role: 'shipper' }).limit(2);
    if (shippers.length === 1) {
      [driver] = shippers;
    }
  }

  if (!driver) {
    throw new Error('No unique shipper account found. Set DRIVER_DEMO_EMAIL to choose the target account.');
  }

  let dashboard = await DriverDashboard.findOne({ userId: driver._id });
  if (dashboard && !dashboard.isDemo && hasExistingNonDemoData(dashboard)) {
    throw new Error('The selected dashboard already contains non-demo data and was not modified.');
  }

  if (!dashboard) {
    dashboard = new DriverDashboard({
      userId: driver._id,
      profile: {
        name: driver.fullName,
        driverCode: `TX-${driver._id.toString().slice(-6).toUpperCase()}`,
        avatarUrl: driver.avatar,
      },
      periods: { today: {}, week: {}, month: {} },
    });
  }

  dashboard.isDemo = true;
  dashboard.profile.tier = 'Đối tác Bạc · DEMO';
  dashboard.profile.vehicle ||= 'Xe máy · DEMO';
  dashboard.profile.licensePlate ||= 'DEMO-00A.00';

  const periodData = Object.fromEntries(
    Object.entries(PERIOD_CONFIG).map(([period, config]) => [
      period,
      createPeriodData(period, config),
    ]),
  );
  const weeklyEarnings = periodData.week.totalEarnings;

  for (const [period, data] of Object.entries(periodData)) {
    dashboard.periods[period] = {
      ...data,
      weeklyEarnings,
    };
  }

  await dashboard.save();
  console.log('Seeded full demo dashboard data for the selected shipper account.');
};

seedDriverDashboardDemo()
  .catch(error => {
    console.error(`Could not seed driver dashboard demo data: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
