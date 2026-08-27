import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAddressLookupConfig,
  fetchAddressSuggestions,
  resetAddressLookupConfigCache
} from '../src/api/addressApi.js';
import { resetApiBaseForTests } from '../src/api/apiBase.js';

describe('addressApi browser lookup', () => {
  beforeEach(() => {
    resetAddressLookupConfigCache();
    resetApiBaseForTests();
    vi.stubEnv('VITE_API_BASE_URL', 'https://smith.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetApiBaseForTests();
  });

  it('uses browser domain token when config says browser lookup', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('/api/address/config')) {
        return Response.json({
          configured: true,
          lookupVia: 'browser',
          domainToken: 'dtoken_test'
        });
      }
      if (String(url).includes('api.getAddress.io/autocomplete')) {
        return Response.json({
          suggestions: [{ id: 'abc', address: '41 Wagtail Way, Fareham' }]
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const config = await fetchAddressLookupConfig(fetchImpl);
    expect(config.lookupVia).toBe('browser');

    const result = await fetchAddressSuggestions('wagtail', 'GB', fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.suggestions).toEqual([{ id: 'abc', label: '41 Wagtail Way, Fareham' }]);
    expect(String(fetchImpl.mock.calls.at(-1)?.[0])).toContain('api.getAddress.io');
  });
});
