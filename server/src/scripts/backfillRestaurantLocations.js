import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
import Restaurant from '../models/Restaurant.js';
import Address from '../models/Address.js';
import User from '../models/User.js';
import { resolveLocationFromAddress } from '../utils/distance.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Backfill] Connected to MongoDB');

  // 1. Cập nhật tọa độ cho tất cả Nhà hàng bằng updateOne
  const restaurants = await Restaurant.find({});
  for (const r of restaurants) {
    const coords = await resolveLocationFromAddress(r.address + ' ' + r.name);
    await Restaurant.updateOne({ _id: r._id }, { $set: { location: coords } });
    console.log(`[Backfill] Restaurant "${r.name}" (${r.address}):`, coords);
  }

  // 2. Cập nhật tọa độ cho Address collection
  const addresses = await Address.find({});
  for (const a of addresses) {
    const coords = await resolveLocationFromAddress(a.addressLine);
    await Address.updateOne({ _id: a._id }, { $set: { location: coords } });
    console.log(`[Backfill] Address "${a.addressLine}":`, coords);
  }

  // 3. Cập nhật tọa độ cho User.addresses (địa chỉ nhúng của người dùng)
  const users = await User.find({ 'addresses.0': { $exists: true } });
  for (const u of users) {
    for (const addr of u.addresses) {
      const fullAddr = [addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(', ');
      const coords = await resolveLocationFromAddress(fullAddr);
      await User.updateOne(
        { _id: u._id, 'addresses._id': addr._id },
        { $set: { 'addresses.$.location': coords } }
      );
      console.log(`[Backfill] User (${u.email}) address "${fullAddr}":`, coords);
    }
  }

  console.log('[Backfill] Hoàn tất cập nhật GPS!');
  process.exit(0);
};

run().catch((err) => {
  console.error('[Backfill] Lỗi:', err);
  process.exit(1);
});
