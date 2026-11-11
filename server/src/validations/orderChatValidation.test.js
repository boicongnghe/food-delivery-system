import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrderMessageSchema, orderChatParamsSchema } from './orderChatValidation.js';

test('trims valid order chat messages', () => {
  const { error, value } = createOrderMessageSchema.validate({ message: '  Đang đến nơi  ' });

  assert.equal(error, undefined);
  assert.equal(value.message, 'Đang đến nơi');
});

test('rejects empty and oversized order chat messages', () => {
  assert.ok(createOrderMessageSchema.validate({ message: '   ' }).error);
  assert.ok(createOrderMessageSchema.validate({ message: 'a'.repeat(1001) }).error);
});

test('requires a valid order id for order chat routes', () => {
  assert.equal(orderChatParamsSchema.validate({ orderId: '0123456789abcdef01234567' }).error, undefined);
  assert.ok(orderChatParamsSchema.validate({ orderId: 'not-an-object-id' }).error);
});
