import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import Address from '../models/Address.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import ShipperWithdrawal from '../models/ShipperWithdrawal.js';
import { deleteCustomerAccount } from './authService.js';
import { protect } from '../middlewares/authMiddleware.js';

const makeUserDoc = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId('650000000000000000000010'),
  fullName: 'Khách Hàng Test',
  email: 'customer.test@example.com',
  phone: '0901234567',
  role: 'customer',
  walletBalance: 0,
  password: 'hashed-password',
  isActive: true,
  isDeleted: false,
  comparePassword: async (pw) => pw === 'Secret123!',
  ...overrides,
});

const mockFindById = (userDoc) =>
  mock.method(User, 'findById', () => ({
    select: async () => userDoc,
  }));

test.afterEach(() => {
  mock.restoreAll();
});

test('blocks account deletion when walletBalance > 0', async () => {
  mockFindById(makeUserDoc({ walletBalance: 25000 }));
  mock.method(Order, 'findOne', async () => null);

  await assert.rejects(
    () => deleteCustomerAccount('650000000000000000000010', { password: 'Secret123!' }),
    (err) => err.statusCode === 400 && /số dư/i.test(err.message),
  );
});

test('blocks account deletion when pending WithdrawalRequest exists', async () => {
  mockFindById(makeUserDoc({ walletBalance: 0 }));
  mock.method(Order, 'findOne', async () => null);
  mock.method(WithdrawalRequest, 'exists', async () => ({ _id: 'wd1' }));
  mock.method(ShipperWithdrawal, 'exists', async () => null);

  await assert.rejects(
    () => deleteCustomerAccount('650000000000000000000010', { password: 'Secret123!' }),
    (err) => err.statusCode === 400 && /yêu cầu rút tiền/i.test(err.message),
  );
});

test('blocks account deletion when requested ShipperWithdrawal exists', async () => {
  mockFindById(makeUserDoc({ walletBalance: 0 }));
  mock.method(Order, 'findOne', async () => null);
  mock.method(WithdrawalRequest, 'exists', async () => null);
  mock.method(ShipperWithdrawal, 'exists', async () => ({ _id: 'swd1' }));

  await assert.rejects(
    () => deleteCustomerAccount('650000000000000000000010', { password: 'Secret123!' }),
    (err) => err.statusCode === 400 && /yêu cầu rút tiền/i.test(err.message),
  );
});

test('soft-deletes and anonymizes user while keeping _id intact for references', async () => {
  const userDoc = makeUserDoc({ walletBalance: 0 });
  mockFindById(userDoc);
  mock.method(Order, 'findOne', async () => null);
  mock.method(WithdrawalRequest, 'exists', async () => null);
  mock.method(ShipperWithdrawal, 'exists', async () => null);

  const notifMock = mock.method(Notification, 'deleteMany', async () => ({ deletedCount: 1 }));
  const addrMock = mock.method(Address, 'deleteMany', async () => ({ deletedCount: 1 }));
  const hardDeleteMock = mock.method(User, 'findByIdAndDelete', async () => {
    throw new Error('Hard delete must not be called');
  });

  let updatePayload = null;
  mock.method(User, 'updateOne', async (filter, update) => {
    updatePayload = { filter, update };
    return { modifiedCount: 1 };
  });

  const res = await deleteCustomerAccount(userDoc._id, { password: 'Secret123!' });
  assert.equal(res.success, true);
  assert.equal(hardDeleteMock.mock.callCount(), 0);
  assert.equal(notifMock.mock.callCount(), 1);
  assert.equal(addrMock.mock.callCount(), 1);

  const setFields = updatePayload?.update?.$set;
  assert.ok(setFields);
  assert.equal(setFields.isDeleted, true);
  assert.equal(setFields.isActive, false);
  assert.ok(setFields.deletedAt instanceof Date);
  assert.equal(setFields.phone, '');
  assert.equal(setFields.fullName, 'Người dùng đã xóa');
  assert.equal(setFields.googleId, null);
  assert.equal(setFields.facebookId, null);
  assert.deepEqual(setFields.payoutAccounts, []);
  assert.match(setFields.email, /^deleted_650000000000000000000010_\d+@deleted\.local$/);

  // Confirm anonymized email & fields pass User Mongoose schema validation
  const anonymizedUser = new User({
    fullName: setFields.fullName,
    email: setFields.email,
    phone: setFields.phone,
    password: setFields.password,
    isActive: setFields.isActive,
    isDeleted: setFields.isDeleted,
    deletedAt: setFields.deletedAt,
  });
  await anonymizedUser.validate();
});

test('protect middleware rejects JWT belonging to soft-deleted user', async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  const token = jwt.sign({ id: '650000000000000000000010' }, process.env.JWT_SECRET);
  mock.method(User, 'findById', async () => ({
    _id: '650000000000000000000010',
    isActive: false,
    isDeleted: true,
  }));

  const req = { headers: { authorization: `Bearer ${token}` } };
  let forwardedErr = null;
  await new Promise((resolve) => {
    protect(req, {}, (err) => {
      forwardedErr = err;
      resolve();
    });
  });
  assert.ok(forwardedErr);
  assert.equal(forwardedErr.statusCode, 401);
});
