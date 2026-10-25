// Seed sample orders for the kitchen board (demo/testing only).
// Usage (from server/):
//   npm run seed:orders            -> REPLACES all orders of the restaurant with a full demo set
//   npm run seed:orders -- --new   -> adds ONE new pending order (test auto refresh + bell)
// Owner: OWNER_EMAIL env or chuquan@fooddelivery.vn. Needs `npm run seed:menu` first.
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import { generateOrderCode } from '../services/counterService.js';

const ownerEmail = process.env.OWNER_EMAIL || 'chuquan@fooddelivery.vn';
const onlyNewOrder = process.argv.includes('--new');

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000);
const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

// Build an order line from a real menu item: required option groups take their first choice
const buildItem = (menuItem, { quantity = 1, withTopping = false, note = '' }) => {
  const options = [];
  for (const group of menuItem.optionGroups) {
    if (group.isRequired || withTopping) {
      const option = group.options[0];
      options.push({ groupName: group.name, name: option.name, price: option.price });
    }
  }
  const unitPrice = menuItem.price + options.reduce((sum, option) => sum + option.price, 0);
  return {
    menuItem: menuItem._id,
    name: menuItem.name,
    image: menuItem.image,
    unitPrice,
    quantity,
    options,
    note,
    lineTotal: unitPrice * quantity,
  };
};

const PAYMENTS = {
  momoPaid: (at) => ({ method: 'momo', status: 'paid', paidAt: at }),
  momoUnpaid: () => ({ method: 'momo', status: 'unpaid' }), // customer still on the payment page
  cod: () => ({ method: 'cod', status: 'unpaid' }),
};

/**
 * Demo scenarios matching the kitchen board design.
 * picks: [menuIndex, options] - menuIndex wraps around the restaurant's menu.
 */
const SCENARIOS = [
  // ----- Đơn mới (pending)
  { status: 'pending', createdMin: 7, name: 'Anh Hoàng', phone: '0901234456', type: 'express', payment: 'momoPaid',
    note: 'Xin nhiều ớt tươi và chanh thái lát, không lấy hành tây.',
    picks: [[0, { quantity: 2, withTopping: true, note: 'Nhiều bánh phở, nước béo riêng' }], [7, { quantity: 1 }], [8, { quantity: 2 }]] },
  { status: 'pending', createdMin: 2.5, name: 'Chị Thảo', phone: '0981234112', type: 'standard', payment: 'cod',
    note: '', picks: [[6, { quantity: 1, note: 'Ít hành' }], [9, { quantity: 1, note: 'Ít đường, không đá' }]] },
  { status: 'pending', createdMin: 0.75, name: 'Lê Hoàng Nam', phone: '0941234339', type: 'express', payment: 'momoPaid',
    note: '', address: '45 Huỳnh Thúc Kháng, Đống Đa, Hà Nội', picks: [[2, { quantity: 3 }]] },
  // Customer cancelled before the restaurant accepted -> refunded automatically
  { status: 'cancelled', createdMin: 6, cancelledMin: 2, cancelledBy: 'customer', name: 'Trần Bảo Ngân', phone: '0912345678',
    type: 'standard', payment: 'momoPaid', note: '', picks: [[1, { quantity: 1 }]] },
  // MoMo not paid yet -> must NOT appear on the kitchen board nor for shippers
  { status: 'pending', createdMin: 1, name: 'Khách Chưa Trả', phone: '0909000111', type: 'standard', payment: 'momoUnpaid',
    note: '', picks: [[3, { quantity: 1 }]] },
  // ----- Đang chuẩn bị (preparing)
  { status: 'preparing', createdMin: 12, acceptedMin: 8.5, name: 'Trịnh Thu Trang', phone: '0971234654', type: 'standard',
    payment: 'momoPaid', expectedInMin: 25, note: 'Đóng 2 hộp riêng biệt, kèm 2 đôi đũa tre & ớt ngâm giấm.',
    address: '18 Tam Trinh, Hoàng Mai, Hà Nội',
    picks: [[0, { quantity: 2, withTopping: true }], [7, { quantity: 1 }], [9, { quantity: 2 }]] },
  { status: 'preparing', createdMin: 6, acceptedMin: 3, name: 'Phạm Quốc Huy', phone: '0961234777', type: 'express',
    payment: 'cod', expectedInMin: 15, note: '', picks: [[5, { quantity: 2 }], [8, { quantity: 1 }]] },
  // ----- Sẵn sàng lấy hàng (ready_for_pickup)
  { status: 'ready_for_pickup', createdMin: 25, acceptedMin: 22, readyMin: 4, name: 'Đỗ Minh Châu', phone: '0931234222',
    type: 'standard', payment: 'cod', note: '', picks: [[2, { quantity: 3 }], [7, { quantity: 2 }]] },
  { status: 'ready_for_pickup', createdMin: 30, acceptedMin: 27, readyMin: 6, withShipper: true, name: 'Vũ Thanh Hà',
    phone: '0921234888', type: 'express', payment: 'momoPaid', note: '', picks: [[6, { quantity: 1 }]] },
  // ----- History today (for "Hoàn thành" stats)
  { status: 'delivered', createdMin: 120, acceptedMin: 118, readyMin: 105, withShipper: true, name: 'Ngô Gia Bảo',
    phone: '0951234101', type: 'standard', payment: 'cod', note: '', picks: [[1, { quantity: 2 }]] },
  { status: 'delivering', createdMin: 50, acceptedMin: 48, readyMin: 35, withShipper: true, name: 'Hoàng Yến',
    phone: '0991234202', type: 'express', payment: 'momoPaid', note: '', picks: [[0, { quantity: 1 }]] },
];

const buildOrder = async (scenario, { restaurant, customer, shipper, menuItems }) => {
  const createdAt = minutesAgo(scenario.createdMin);
  const items = scenario.picks.map(([index, options]) => buildItem(menuItems[index % menuItems.length], options));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingFee = scenario.type === 'express' ? 25000 : 15000;
  const total = subtotal + shippingFee;

  const history = [{ status: 'pending', at: createdAt, byRole: 'customer' }];
  const order = {
    orderCode: await generateOrderCode(),
    customer: customer._id,
    restaurant: restaurant._id,
    shipper: null,
    items,
    subtotal,
    packagingFee: 0,
    shippingFee,
    discount: 0,
    total,
    delivery: {
      recipientName: scenario.name,
      phone: scenario.phone,
      address: scenario.address || '12 Phố Huế, Hai Bà Trưng, Hà Nội',
      type: scenario.type,
      expectedAt: scenario.expectedInMin ? minutesFromNow(scenario.expectedInMin) : null,
    },
    customerNote: scenario.note,
    payment: PAYMENTS[scenario.payment](createdAt),
    status: scenario.status,
    createdAt,
    updatedAt: createdAt,
  };

  if (scenario.acceptedMin) {
    order.acceptedAt = minutesAgo(scenario.acceptedMin);
    history.push({ status: 'preparing', at: order.acceptedAt, byRole: 'restaurant' });
  }
  if (scenario.readyMin) {
    order.readyAt = minutesAgo(scenario.readyMin);
    history.push({ status: 'ready_for_pickup', at: order.readyAt, byRole: 'restaurant' });
  }
  if (scenario.withShipper && shipper) {
    order.shipper = shipper._id;
  }
  if (['delivering', 'delivered'].includes(scenario.status)) {
    history.push({ status: 'delivering', at: minutesAgo(scenario.readyMin - 3), byRole: 'shipper' });
  }
  if (scenario.status === 'delivered') {
    history.push({ status: 'delivered', at: minutesAgo(scenario.readyMin - 20), byRole: 'shipper' });
    if (order.payment.method === 'cod') order.payment = { ...order.payment, status: 'paid', paidAt: minutesAgo(80) };
  }
  if (scenario.status === 'cancelled') {
    const at = minutesAgo(scenario.cancelledMin);
    history.push({ status: 'cancelled', at, byRole: scenario.cancelledBy });
    order.cancellation = { by: scenario.cancelledBy, reason: 'changed_mind', note: 'Khách đổi ý', at };
    order.payment = { ...order.payment, status: 'refunded', refundedAt: at, refundAmount: total };
  }

  order.statusHistory = history;
  // timestamps: false keeps our createdAt (orders placed minutes ago)
  return new Order(order).save({ timestamps: false });
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const owner = await User.findOne({ email: ownerEmail, role: 'restaurant_owner' });
  const restaurant = owner && (await Restaurant.findOne({ owner: owner._id }));
  if (!restaurant) {
    throw new Error(`No restaurant for ${ownerEmail}. Run "npm run seed:menu" first.`);
  }
  const menuItems = await MenuItem.find({ restaurant: restaurant._id, isDeleted: false, isVisible: true }).sort({
    category: 1,
    sortOrder: 1,
  });
  if (menuItems.length === 0) {
    throw new Error('The restaurant has no visible menu items. Run "npm run seed:menu" first.');
  }
  const customer =
    (await User.findOne({ email: 'khachhang@fooddelivery.vn', role: 'customer' })) ||
    (await User.findOne({ role: 'customer' }));
  if (!customer) {
    throw new Error('No customer account found. Run "node src/seed.js" or register a customer first.');
  }
  const shipper =
    (await User.findOne({ email: 'taixe@fooddelivery.vn', role: 'shipper' })) || (await User.findOne({ role: 'shipper' }));

  const context = { restaurant, customer, shipper, menuItems };

  if (onlyNewOrder) {
    const order = await buildOrder({ ...SCENARIOS[2], createdMin: 0, name: 'Khách Mới' }, context);
    console.log(`Created new pending order ${order.orderCode} for ${restaurant.name}`);
    return;
  }

  // Only approved restaurants can accept orders. There is no admin approval screen yet,
  // so the demo restaurant is approved here (dev data only).
  if (restaurant.status !== 'approved') {
    restaurant.status = 'approved';
    await restaurant.save();
    console.log(`Approved demo restaurant ${restaurant.name} (status was not "approved")`);
  }

  await Order.syncIndexes();
  await Order.deleteMany({ restaurant: restaurant._id });
  for (const scenario of SCENARIOS) {
    await buildOrder(scenario, context);
  }
  console.log(`Seeded ${SCENARIOS.length} orders for ${restaurant.name}${shipper ? '' : ' (no shipper account: shipper names hidden)'}`);
};

run()
  .catch((error) => {
    console.error(`Order seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
