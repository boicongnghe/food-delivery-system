import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Shipper from '../models/Shipper.js';

const DEMO_EMAIL = 'taixe@fooddelivery.vn';
const DEMO_PASSWORD = 'password123';

const seedDriverDemoAccount = async () => {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Set NODE_ENV=development to create the demo driver account.');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Configure server/.env before seeding.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email: DEMO_EMAIL }).select('+password');
  if (user) {
    if (user.role !== 'shipper') {
      throw new Error(`${DEMO_EMAIL} already exists with a non-shipper role; no changes were made.`);
    }
    if (!user.isActive) {
      throw new Error(`${DEMO_EMAIL} is inactive; no changes were made.`);
    }
    if (!(await user.comparePassword(DEMO_PASSWORD))) {
      throw new Error(
        `${DEMO_EMAIL} already exists with a different password; no changes were made.`,
      );
    }
    console.log(`Demo driver account ${DEMO_EMAIL} already exists and is ready.`);
  } else {
    user = await User.create({
      fullName: 'Lê Văn Tài Xế',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      phone: '0923456789',
      role: 'shipper',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    });
    console.log(`Created demo driver account ${DEMO_EMAIL}.`);
  }

  const shipper = await Shipper.findOne({ user: user._id });
  if (!shipper) {
    await Shipper.create({
      user: user._id,
      fullName: user.fullName,
      phone: user.phone,
      dateOfBirth: '1996-10-12',
      citizenId: '079200008899',
      vehicleInfo: 'Honda Wave Alpha · DEMO',
      status: 'approved',
      isOnline: true,
    });
    console.log('Created approved demo driver profile.');
  }
};

seedDriverDemoAccount()
  .catch((error) => {
    console.error(`Could not seed demo driver account: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
