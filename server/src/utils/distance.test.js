import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import ApiError from './ApiError.js';
import {
  DEFAULT_HOA_LAC_COORDINATES,
  isLocationMismatch,
  resolveLocationFromAddress,
} from './distance.js';

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

test('detects a Ho Chi Minh City address paired with Hanoi coordinates', () => {
  assert.equal(isLocationMismatch('Thành phố Hồ Chí Minh', 21.0131, 105.5255), true);
  assert.equal(isLocationMismatch('Thành phố Hồ Chí Minh', 10.8231, 106.6297), false);
});

test('geocodes Ho Chi Minh City text directly without appending a Hanoi location', async () => {
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => [{ lat: '10.8231', lon: '106.6297' }],
    };
  };

  const coordinates = await resolveLocationFromAddress('Thành phố Hồ Chí Minh', { allowDefault: false });

  assert.deepEqual(coordinates, { lat: 10.8231, lng: 106.6297 });
  assert.equal(requestedUrl.searchParams.get('q'), 'Thành phố Hồ Chí Minh');
  assert.equal(requestedUrl.searchParams.get('countrycodes'), 'vn');
});
