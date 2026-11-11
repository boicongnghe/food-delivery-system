import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Order from '../models/Order.js';

const DEMO_OWNER_EMAIL = 'demo-shipper-restaurant@fooddelivery.vn';
const DEMO_CUSTOMER_EMAIL = 'demo-shipper-customer@fooddelivery.vn';
const DEMO_ORDER_CODES = ['DEMO-SHIPPER-001', 'DEMO-SHIPPER-002', 'DEMO-SHIPPER-003'];
const DEMO_RESTAURANT_ADDRESS = 'Khu CNC Hòa Lạc, Thạch Thất, Hà Nội';
const DEMO_RESTAURANT_LOCATION = { lat: 21.0131, lng: 105.5262 };
const DEMO_ITEMS = [
  { name: 'Phở bò tái', price: 65000 },
  { name: 'Nem rán Hà Nội', price: 35000 },
  { name: 'Trà chanh', price: 25000 },
];
const HOA_LAC_LOCATIONS = [
  {
    address: 'Phòng 305, Ký túc xá Dom A, Trường Đại học FPT, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội',
    location: { lat: 21.0131, lng: 105.5262 },
  },
  {
    address: 'Sảnh Tầng 1, Tòa nhà Alpha, Trường Đại học FPT, Km29 Đại lộ Thăng Long, Thạch Thất, Hà Nội',
    location: { lat: 21.0135, lng: 105.5248 },
  },
  {
    address: 'Nhà trọ Hoa Hồng, Thôn 2, Xã Tân Xã, Huyện Thạch Thất, Hà Nội',
    location: { lat: 21.0185, lng: 105.536 },
  },
  {
    address: 'Tòa KTX QG01, Ký túc xá ĐHQGHN, Thạch Hòa, Thạch Thất, Hà Nội',
    location: { lat: 21.0028, lng: 105.5097 },
  },
  {
    address: 'Khu CNC Hòa Lạc, Thạch Thất, Hà Nội',
    location: { lat: 21.0205, lng: 105.5385 },
  },
];
const ORDER_SCENARIOS = [
  {
    name: 'Nguyễn Minh Anh',
    phone: '0901234567',
    ...HOA_LAC_LOCATIONS[0],
    type: 'standard',
    payment: { method: 'momo', status: 'paid', paidAt: new Date() },
    shippingFee: 15000,
    itemIndexes: [0, 1],
  },
  {
    name: 'Trần Thu Hà',
    phone: '0912345678',
    ...HOA_LAC_LOCATIONS[1],
    type: 'express',
    payment: { method: 'momo', status: 'paid', paidAt: new Date() },
    shippingFee: 25000,
    itemIndexes: [1, 2],
  },
  {
    name: 'Lê Hoàng Nam',
    phone: '0941234567',
    ...HOA_LAC_LOCATIONS[2],
    type: 'standard',
    payment: { method: 'vnpay', status: 'paid', paidAt: new Date() },
    shippingFee: 18000,
    itemIndexes: [0, 2],
  },
];

const buildOrderItem = (item) => {
  return {
    name: item.name,
    image: '',
    price: item.price,
    unitPrice: item.price,
    quantity: 1,
    options: [],
    note: '',
    lineTotal: item.price,
  };
};

const getOrCreateDemoUser = async ({ email, fullName, phone, role }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== role || !existing.isActive) {
      throw new Error(`${email} exists but is not an active ${role} account.`);
    }
    return existing;
  }
  return User.create({
    email,
    fullName,
    phone,
    role,
    password: randomBytes(32).toString('hex'),
  });
};

const seedShipperOrdersDemo = async () => {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Set NODE_ENV=development to run the demo order seed.');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Configure server/.env before seeding.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const owner = await getOrCreateDemoUser({
    email: DEMO_OWNER_EMAIL,
    fullName: 'Chủ quán Demo Shipper',
    phone: '0912345001',
    role: 'restaurant_owner',
  });
  let restaurant = await Restaurant.findOne({ owner: owner._id });
  if (!restaurant) {
    restaurant = await Restaurant.create({
      owner: owner._id,
      name: 'Quán Demo Đơn Giao',
      description: 'Nhà hàng mẫu dùng để thử quy trình shipper.',
      address: DEMO_RESTAURANT_ADDRESS,
      location: DEMO_RESTAURANT_LOCATION,
      location: { lat: 21.0131, lng: 105.5262 },
      phone: '0912345001',
      categories: ['Món Việt'],
      status: 'approved',
      openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        isOpen: true,
        shifts: [{ open: '06:00', close: '22:00' }],
      })),
    });
  } else if (restaurant.status !== 'approved') {
    throw new Error('The demo restaurant exists but is not approved; no records were changed.');
  } else if (
    restaurant.address !== DEMO_RESTAURANT_ADDRESS
    || restaurant.location?.lat !== DEMO_RESTAURANT_LOCATION.lat
    || restaurant.location?.lng !== DEMO_RESTAURANT_LOCATION.lng
  ) {
    restaurant.address = DEMO_RESTAURANT_ADDRESS;
    restaurant.location = DEMO_RESTAURANT_LOCATION;
    await restaurant.save();
  }
  const customer = await getOrCreateDemoUser({
    email: DEMO_CUSTOMER_EMAIL,
    fullName: 'Khách Demo Giao Hàng',
    phone: '0901234001',
    role: 'customer',
  });

  const existingCodes = new Set(
    (await Order.find({ orderCode: { $in: DEMO_ORDER_CODES } }).select('orderCode').lean())
      .map(order => order.orderCode),
  );
  const now = new Date();
  const orders = [];

  for (const [index, scenario] of ORDER_SCENARIOS.entries()) {
    const orderCode = DEMO_ORDER_CODES[index];
    if (existingCodes.has(orderCode)) continue;

    const items = scenario.itemIndexes.map(itemIndex => buildOrderItem(DEMO_ITEMS[itemIndex]));
    const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
    const readyAt = new Date(now.getTime() - (index + 2) * 60 * 1000);
    const createdAt = new Date(readyAt.getTime() - 15 * 60 * 1000);
    orders.push({
      orderCode,
      orderNumber: orderCode,
      customer: customer._id,
      restaurant: restaurant._id,
      shipper: null,
      items,
      subtotal,
      packagingFee: 0,
      shippingFee: scenario.shippingFee,
      total: subtotal + scenario.shippingFee,
      totalPrice: subtotal + scenario.shippingFee,
      delivery: {
        recipientName: scenario.name,
        phone: scenario.phone,
        address: scenario.address,
        location: scenario.location,
        type: scenario.type,
      },
      deliveryAddress: {
        recipientName: scenario.name,
        phone: scenario.phone,
        addressLine: scenario.address,
        location: scenario.location,
        note: 'Đơn hàng minh họa cho luồng giao hàng.',
      },
      customerNote: 'Đơn demo shipper',
      payment: scenario.payment,
      paymentMethod: scenario.payment.method,
      paymentStatus: scenario.payment.status,
      status: 'ready_for_pickup',
      acceptedAt: new Date(readyAt.getTime() - 10 * 60 * 1000),
      readyAt,
      statusHistory: [
        { status: 'pending', at: createdAt, byRole: 'customer' },
        { status: 'preparing', at: new Date(readyAt.getTime() - 10 * 60 * 1000), byRole: 'restaurant' },
        { status: 'ready_for_pickup', at: readyAt, byRole: 'restaurant' },
      ],
      createdAt,
      updatedAt: readyAt,
    });
  }

  if (orders.length > 0) {
    await Order.insertMany(orders);
  }
  console.log(`Created ${orders.length} demo shipper order(s); ${existingCodes.size} already existed.`);
};

seedShipperOrdersDemo()
  .catch(error => {
    console.error(`Could not seed demo shipper orders: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
