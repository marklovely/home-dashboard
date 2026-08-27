import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAddressSuggestions,
  resetAddressLookupConfigCache
} from '../src/api/addressApi.js';
import { resetApiBaseForTests } from '../src/api/apiBase.js';

describe('addressApi browser Google Places lookup', () => {
  beforeEach(() => {
    resetAddressLookupConfigCache();
    resetApiBaseForTests();
    vi.stubEnv('VITE_API_BASE_URL', 'https://smith.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetApiBaseForTests();
  });

  it('calls Google Places from the browser when configured', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      if (String(url).includes('/api/address/config')) {
        return Response.json({
          configured: true,
          lookupVia: 'browser',
          placesApiKey: 'AIza_test'
        });
      }
      if (String(url).includes('places.googleapis.com/v1/places:autocomplete')) {
        expect(init?.method).toBe('POST');
        return Response.json({
          suggestions: [
            {
              placePrediction: {
                placeId: 'ChIJ_test',
                text: { text: '41 Wagtail Way, Fareham' }
              }
            }
          ]
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const result = await fetchAddressSuggestions('wagtail', 'GB', fetchImpl, 'session-1');
    expect(result.ok).toBe(true);
    expect(result.suggestions).toHaveLength(1);
    expect(String(fetchImpl.mock.calls.at(-1)?.[0])).toContain('places.googleapis.com');
  });
});
