import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import DriverDashboard from '../models/DriverDashboard.js';
import ShipperWithdrawal from '../models/ShipperWithdrawal.js';
import Notification from '../models/Notification.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Shipper from '../models/Shipper.js';
import walletRouter from '../routes/walletRoutes.js';
import * as walletService from './walletService.js';
import * as paymentService from './paymentService.js';
import * as shipperWalletService from './shipperWalletService.js';
import driverDashboardService from './driverDashboardService.js';

const USER_ID = '650000000000000000000021';

const runMiddlewares = (handlers, req) =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    let idx = 0;
    const next = (err) => {
      if (err) {
        resolve({ res, capturedError: err });
        return;
      }
      const fn = handlers[idx++];
      if (!fn) {
        resolve({ res, capturedError: null });
        return;
      }
      try {
        Promise.resolve(fn(req, res, next)).catch((caught) => {
          resolve({ res, capturedError: caught });
        });
      } catch (caught) {
        resolve({ res, capturedError: caught });
      }
    };

    next();
  });

const getRouteAuthMiddlewares = (method, path) => {
  const layer = walletRouter.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method],
  );
  assert.ok(layer, `Route ${method.toUpperCase()} ${path} must exist on walletRouter`);
  // Only run middlewares up to before the final controller so controller doesn't hit DB
  return layer.route.stack.slice(0, -1).map((item) => item.handle);
};

test.afterEach(() => {
  mock.restoreAll();
});

test('walletRoutes rejects restaurant_owner, shipper, and admin on customer wallet endpoints with 403', async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-wallet-secret';
  const protectedCustomerRoutes = [
    ['get', '/my-wallet'],
    ['post', '/withdraw'],
    ['post', '/deposit/create'],
    ['post', '/deposit/confirm'],
  ];

  for (const role of ['restaurant_owner', 'shipper', 'admin']) {
    mock.method(User, 'findById', async () => ({
      _id: USER_ID,
      role,
      isActive: true,
      isDeleted: false,
    }));

    const token = jwt.sign({ id: USER_ID, role }, process.env.JWT_SECRET);
    for (const [method, path] of protectedCustomerRoutes) {
      const middlewares = getRouteAuthMiddlewares(method, path);
      const req = {
        headers: { authorization: `Bearer ${token}` },
        method: method.toUpperCase(),
        originalUrl: `/api/wallet${path}`,
      };
      const { capturedError } = await runMiddlewares(middlewares, req);
      assert.ok(capturedError, `${role} should be blocked on ${method.toUpperCase()} ${path}`);
      assert.equal(capturedError.statusCode, 403);
    }
    mock.restoreAll();
  }
});

test('walletRoutes allows customer on customer wallet endpoints and allows both customer and shipper on /payout-accounts', async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-wallet-secret';

  for (const [role, path, method, shouldPass] of [
    ['customer', '/my-wallet', 'get', true],
    ['customer', '/withdraw', 'post', true],
    ['customer', '/deposit/create', 'post', true],
    ['customer', '/deposit/confirm', 'post', true],
    ['shipper', '/payout-accounts', 'get', true],
    ['customer', '/payout-accounts', 'get', true],
    ['restaurant_owner', '/payout-accounts', 'get', false],
    ['admin', '/payout-accounts', 'get', false],
  ]) {
    mock.method(User, 'findById', async () => ({
      _id: USER_ID,
      role,
      isActive: true,
      isDeleted: false,
    }));

    const token = jwt.sign({ id: USER_ID, role }, process.env.JWT_SECRET);
    const middlewares = getRouteAuthMiddlewares(method, path);
    const req = {
      headers: { authorization: `Bearer ${token}` },
      method: method.toUpperCase(),
      originalUrl: `/api/wallet${path}`,
    };
    const { capturedError } = await runMiddlewares(middlewares, req);
    if (shouldPass) {
      assert.equal(capturedError, null, `${role} should pass auth on ${method.toUpperCase()} ${path}`);
      assert.equal(req.user.role, role);
    } else {
      assert.ok(capturedError);
      assert.equal(capturedError.statusCode, 403);
    }
    mock.restoreAll();
  }
});

test('walletService blocks deposit, withdrawal, and balance read for non-customer roles', async () => {
  for (const role of ['shipper', 'restaurant_owner', 'admin']) {
    mock.method(User, 'findById', () => ({
      select: () => ({
        lean: async () => ({
          _id: USER_ID,
          role,
          walletBalance: 500000,
          fullName: 'Non Customer',
          phone: '0909999999',
        }),
      }),
    }));

    await assert.rejects(
      () => walletService.getMyWallet(USER_ID),
      (err) => err.statusCode === 403,
    );
    await assert.rejects(
      () => walletService.createDepositRequest(USER_ID, { amount: 50000 }),
      (err) => err.statusCode === 403,
    );
    await assert.rejects(
      () => walletService.requestCustomerWithdrawal(USER_ID, { amount: 50000 }),
      (err) => err.statusCode === 403,
    );
    await assert.rejects(
      () => walletService.confirmDeposit(USER_ID, { amount: 50000, depositCode: 'NAP VI 0909999999 1234' }),
      (err) => err.statusCode === 403,
    );
    mock.restoreAll();
  }
});

test('handleSepayWebhook refuses NAP VI wallet deposit when target user is not a customer', async () => {
  delete process.env.SEPAY_API_KEY;
  mock.method(User, 'findOne', async () => ({
    _id: new mongoose.Types.ObjectId(USER_ID),
    role: 'shipper',
    phone: '0901111222',
    walletBalance: 0,
  }));
  const updateMock = mock.method(User, 'findOneAndUpdate', async () => {
    throw new Error('Must not credit non-customer walletBalance');
  });

  const result = await paymentService.handleSepayWebhook({
    id: 1001,
    transferType: 'in',
    transferAmount: 100000,
    content: 'NAP VI 0901111222 1234',
    referenceCode: 'SEPAY-TEST-1',
  });

  assert.equal(result.success, false);
  assert.match(result.message, /khách hàng/i);
  assert.equal(updateMock.mock.callCount(), 0);
});

test('shipperWalletService deducts exclusively from DriverDashboard.walletBalance and never touches User.walletBalance', async () => {
  const userUpdateMock = mock.method(User, 'findOneAndUpdate', async () => {
    throw new Error('Shipper withdrawal must not touch User.walletBalance');
  });
  const customerWdMock = mock.method(WithdrawalRequest, 'create', async () => {
    throw new Error('Shipper withdrawal must not create customer WithdrawalRequest');
  });
  const walletTxMock = mock.method(WalletTransaction, 'create', async () => {
    throw new Error('Shipper withdrawal must not create customer WalletTransaction');
  });

  mock.method(User, 'findById', () => ({
    select: async () => ({
      role: 'shipper',
      isActive: true,
      payoutAccounts: [
        {
          bankName: 'TPBank',
          accountNumber: '0123456789',
          accountHolder: 'TRAN SHIPPER',
          isDefault: true,
        },
      ],
    }),
  }));

  mock.method(driverDashboardService, 'getDashboard', async () => ({ walletBalance: 300000 }));
  mock.method(mongoose, 'startSession', async () => ({
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  }));
  mock.method(ShipperWithdrawal, 'aggregate', () => {
    const promise = Promise.resolve([]);
    promise.session = () => promise;
    return promise;
  });

  let dashboardFilter = null;
  let dashboardUpdate = null;
  mock.method(DriverDashboard, 'updateOne', async (filter, update) => {
    dashboardFilter = filter;
    dashboardUpdate = update;
    return { modifiedCount: 1 };
  });

  mock.method(ShipperWithdrawal, 'create', async (docs) => [
    {
      ...docs[0],
      toObject: () => ({ ...docs[0], _id: 'swd-1' }),
    },
  ]);
  mock.method(DriverDashboard, 'findOne', () => ({
    select: () => ({
      lean: async () => ({ walletBalance: 200000 }),
    }),
  }));

  const res = await shipperWalletService.requestWithdrawal(USER_ID, 100000);
  assert.equal(userUpdateMock.mock.callCount(), 0);
  assert.equal(customerWdMock.mock.callCount(), 0);
  assert.equal(walletTxMock.mock.callCount(), 0);
  assert.deepEqual(dashboardFilter, { userId: USER_ID, walletBalance: { $gte: 100000 } });
  assert.deepEqual(dashboardUpdate, { $inc: { walletBalance: -100000 } });
  assert.equal(res.walletBalance, 200000);
  assert.equal(res.withdrawal.amount, 100000);
});

test('walletService allows customer role and scopes updates with role: customer', async () => {
  mock.method(Notification, 'create', async () => ({ _id: 'notif-1' }));
  mock.method(User, 'findById', () => ({
    select: () => ({
      lean: async () => ({
        _id: USER_ID,
        role: 'customer',
        walletBalance: 120000,
        fullName: 'Khách Hàng',
        phone: '0901234567',
      }),
    }),
  }));

  let confirmFilter = null;
  mock.method(User, 'findOneAndUpdate', async (filter) => {
    confirmFilter = filter;
    return { _id: USER_ID, role: 'customer', walletBalance: 170000 };
  });
  mock.method(WalletTransaction, 'create', async (doc) => ({ _id: 'tx-1', ...doc }));

  const res = await walletService.confirmDeposit(USER_ID, {
    amount: 50000,
    depositCode: 'NAP VI 0901234567 1234',
  });
  assert.deepEqual(confirmFilter, { _id: USER_ID, role: 'customer' });
  assert.equal(res.walletBalance, 170000);
});

test('driverDashboardService returns root DriverDashboard.walletBalance regardless of legacy periods.today.walletBalance', async () => {
  mock.method(User, 'findById', () => ({
    select: () => ({
      lean: async () => ({
        _id: USER_ID,
        role: 'shipper',
        fullName: 'Tài Xế Test',
        phone: '0908887777',
        avatar: '',
      }),
      then: (resolve) =>
        resolve({
          _id: USER_ID,
          role: 'shipper',
          isActive: true,
          payoutAccounts: [
            {
              bankName: 'TPBank',
              accountNumber: '0123456789',
              accountHolder: 'TAI XE',
              isDefault: true,
            },
          ],
        }),
    }),
  }));

  mock.method(DriverDashboard, 'findOneAndUpdate', () => ({
    lean: async () => ({
      userId: USER_ID,
      isOnline: true,
      isDemo: false,
      walletBalance: 450000,
      profile: { name: 'Tài Xế Test', driverCode: 'TX-000021' },
      periods: {
        today: { walletBalance: 999999, baseFare: 0, bonus: 0 },
        week: { baseFare: 0, bonus: 0 },
        month: { baseFare: 0, bonus: 0 },
      },
    }),
  }));
  mock.method(Shipper, 'findOne', () => ({ select: () => ({ lean: async () => null }) }));
  mock.method(Review, 'aggregate', async () => []);
  mock.method(ShipperWithdrawal, 'aggregate', async () => []);
  mock.method(Order, 'find', () => ({
    select: () => ({
      populate: () => ({
        sort: () => ({ lean: async () => [] }),
      }),
    }),
  }));
  mock.method(Review, 'find', () => ({
    select: () => ({
      populate: () => ({
        sort: () => ({ limit: () => ({ lean: async () => [] }) }),
      }),
    }),
  }));

  const dashboard = await driverDashboardService.getDashboard(USER_ID, 'today');
  assert.equal(dashboard.walletBalance, 450000);
});
