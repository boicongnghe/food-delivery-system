import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import ApiError from './ApiError.js';
import { DEFAULT_HOA_LAC_COORDINATES, resolveLocationFromAddress } from './distance.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('requires a non-empty address when fallback coordinates are disabled', async () => {
  await assert.rejects(
    resolveLocationFromAddress('', { allowDefault: false }),
    (error) => error instanceof ApiError && error.statusCode === 400,
  );
});

test('rejects an address when geocoding returns no result instead of using fallback coordinates', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => [],
  });

  await assert.rejects(
    resolveLocationFromAddress('Unknown address', { allowDefault: false }),
    (error) => error instanceof ApiError && error.statusCode === 422,
  );
});

test('reports geocoding service failures when fallback coordinates are disabled', async () => {
  globalThis.fetch = async () => {
    throw new Error('Network unavailable');
  };

  await assert.rejects(
    resolveLocationFromAddress('Valid address', { allowDefault: false }),
    (error) => error instanceof ApiError && error.statusCode === 503,
  );
});

test('keeps fallback behavior for existing non-delivery callers', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => [],
  });

  assert.deepEqual(await resolveLocationFromAddress('Unknown address'), DEFAULT_HOA_LAC_COORDINATES);
});
