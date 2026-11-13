// Bootstrap or update the Admin account using environment variables (never hardcoded credentials).
// Usage (from server/):
//   npm run seed:admin
import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import User from '../models/User.js';

export const bootstrapAdmin = async ({
  email = process.env.ADMIN_EMAIL,
  password = process.env.ADMIN_PASSWORD,
  fullName = process.env.ADMIN_FULL_NAME || 'Hệ Thống Quản Trị Viên',
  phone = process.env.ADMIN_PHONE || '0999999999',
} = {}) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  if (!normalizedEmail) {
    throw new Error('Missing ADMIN_EMAIL in environment variables.');
  }
  if (trimmedPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  let user = await User.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });
  if (user && user.role !== 'admin') {
    throw new Error(`Account ${normalizedEmail} already exists with role "${user.role}"; aborting.`);
  }

  if (!user) {
    user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: trimmedPassword,
      phone: phone.trim(),
      role: 'admin',
      isActive: true,
      isVerified: true,
    });
    return { action: 'created', email: user.email };
  }

  user.fullName = fullName.trim();
  user.phone = phone.trim();
  user.role = 'admin';
  user.isActive = true;
  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  user.password = trimmedPassword;
  await user.save();
  return { action: 'updated', email: user.email };
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI in server/.env');
  }
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const result = await bootstrapAdmin();
    console.log(`Admin account ${result.action}: ${result.email} (isVerified: true)`);
  } finally {
    await mongoose.disconnect();
  }
};

const isCliEntry =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntry) {
  run().catch(async (error) => {
    console.error(error.message || error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

