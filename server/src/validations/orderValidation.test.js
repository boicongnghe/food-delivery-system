import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrderSchema } from './orderValidation.js';

const validId = '0123456789abcdef01234567';

const buildValidPayload = (overrides = {}) => ({
  restaurantId: validId,
  items: [
    {
      menuItemId: validId,
      name: 'Phở bò',
      price: 50000,
      quantity: 2,
      note: 'Ít hành',
      options: [{ groupName: 'Size', name: 'Lớn', quantity: 1 }],
    },
  ],
  deliveryAddress: {
    addressId: validId,
    recipientName: 'Nguyễn Văn A',
    phone: '0901234567',
    addressLine: 'Thôn 3, Tân Xã, Thạch Thất, Hà Nội',
    note: '',
    location: { lat: null, lng: null },
  },
  paymentMethod: 'banking',
  promotionCode: null,
  restaurantVoucherCode: null,
  ...overrides,
});

test('accepts a valid checkout payload', () => {
  const { error, value } = createOrderSchema.validate(buildValidPayload(), { stripUnknown: true });

  assert.equal(error, undefined);
  assert.equal(value.items.length, 1);
  assert.equal(value.items[0].quantity, 2);
});

test('rejects invalid ObjectIds in restaurantId, menuItemId, and addressId', () => {
  assert.ok(createOrderSchema.validate(buildValidPayload({ restaurantId: 'not-an-id' })).error);
  assert.ok(createOrderSchema.validate(buildValidPayload({ restaurantId: { $ne: null } })).error);
  assert.ok(
    createOrderSchema.validate(
      buildValidPayload({ items: [{ menuItemId: 'bad-id', quantity: 1 }] }),
    ).error,
  );
  assert.ok(
    createOrderSchema.validate(
      buildValidPayload({
        deliveryAddress: {
          ...buildValidPayload().deliveryAddress,
          addressId: 'bad-address-id',
        },
      }),
    ).error,
  );
});

test('enforces items count between 1 and 50 lines', () => {
  assert.ok(createOrderSchema.validate(buildValidPayload({ items: [] })).error);
  assert.ok(createOrderSchema.validate(buildValidPayload({ items: 'invalid-type' })).error);

  const fiftyItems = Array.from({ length: 50 }, () => ({ menuItemId: validId, quantity: 1 }));
  assert.equal(createOrderSchema.validate(buildValidPayload({ items: fiftyItems })).error, undefined);

  const fiftyOneItems = Array.from({ length: 51 }, () => ({ menuItemId: validId, quantity: 1 }));
  assert.ok(createOrderSchema.validate(buildValidPayload({ items: fiftyOneItems })).error);
});

test('enforces integer quantity between 1 and 99', () => {
  assert.ok(createOrderSchema.validate(buildValidPayload({ items: [{ menuItemId: validId, quantity: 0 }] })).error);
  assert.ok(createOrderSchema.validate(buildValidPayload({ items: [{ menuItemId: validId, quantity: 100 }] })).error);
  assert.ok(createOrderSchema.validate(buildValidPayload({ items: [{ menuItemId: validId, quantity: 1.5 }] })).error);
  assert.ok(createOrderSchema.validate(buildValidPayload({ items: [{ menuItemId: validId, quantity: 'abc' }] })).error);
  assert.equal(
    createOrderSchema.validate(buildValidPayload({ items: [{ menuItemId: validId, quantity: 99 }] })).error,
    undefined,
  );
});

test('rejects wrong types for deliveryAddress and paymentMethod', () => {
  assert.ok(createOrderSchema.validate(buildValidPayload({ deliveryAddress: '123 Street' })).error);
  assert.ok(createOrderSchema.validate(buildValidPayload({ paymentMethod: 'crypto' })).error);
  assert.ok(
    createOrderSchema.validate(
      buildValidPayload({
        deliveryAddress: {
          recipientName: 12345,
          phone: '0901234567',
          addressLine: 'Hà Nội',
        },
      }),
    ).error,
  );
});

