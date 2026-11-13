import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import User from '../models/User.js';
import { loginUser } from './authService.js';
import { bootstrapAdmin } from '../seeds/seedAdmin.js';

test.afterEach(() => {
  mock.restoreAll();
});

test('loginUser blocks unverified accounts including previously bypassed demo/admin emails', async () => {
  for (const email of [
    'khachhang@fooddelivery.vn',
    'chuquan@fooddelivery.vn',
    'taixe@fooddelivery.vn',
    'admin@fooddelivery.vn',
  ]) {
    mock.method(User, 'findOne', () => ({
      select: async () => ({
        _id: 'u-demo',
        email,
        isActive: true,
        isVerified: false,
        comparePassword: async () => true,
      }),
    }));

    await assert.rejects(
      () => loginUser({ email, password: 'any-password' }),
      (err) => err.statusCode === 403 && err.requiresVerification === true && err.unverifiedEmail === email,
    );
    mock.restoreAll();
  }
});

test('loginUser allows verified admin account when password matches', async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-login-secret';
  mock.method(User, 'findOne', () => ({
    select: async () => ({
      _id: 'u-admin',
      email: 'admin@fooddelivery.vn',
      role: 'admin',
      isActive: true,
      isVerified: true,
      comparePassword: async (pw) => pw === 'StrongAdmin#2026',
      toJSON() {
        return { _id: this._id, email: this.email, role: this.role, isVerified: this.isVerified };
      },
    }),
  }));

  const res = await loginUser({ email: 'admin@fooddelivery.vn', password: 'StrongAdmin#2026' });
  assert.ok(res.token);
  assert.equal(res.user.role, 'admin');
  assert.equal(res.user.email, 'admin@fooddelivery.vn');
});

test('bootstrapAdmin validates env credentials and creates verified admin without hardcoded password', async () => {
  await assert.rejects(
    () => bootstrapAdmin({ email: '', password: 'StrongPassword1!' }),
    /ADMIN_EMAIL/,
  );
  await assert.rejects(
    () => bootstrapAdmin({ email: 'admin@fooddelivery.vn', password: 'short' }),
    /at least 8 characters/,
  );

  mock.method(User, 'findOne', async () => null);
  let createdPayload = null;
  mock.method(User, 'create', async (doc) => {
    createdPayload = doc;
    return doc;
  });

  const res = await bootstrapAdmin({
    email: 'Admin@FoodDelivery.vn',
    password: 'StrongAdminPassword!99',
  });
  assert.equal(res.action, 'created');
  assert.equal(res.email, 'admin@fooddelivery.vn');
  assert.equal(createdPayload.role, 'admin');
  assert.equal(createdPayload.isVerified, true);
  assert.equal(createdPayload.isActive, true);
});

