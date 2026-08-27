import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAddressSuggestions } from '../src/api/addressApi.js';
import { resetApiBaseForTests } from '../src/api/apiBase.js';

describe('addressApi worker lookup', () => {
  beforeEach(() => {
    resetApiBaseForTests();
    vi.stubEnv('VITE_API_BASE_URL', 'https://smith.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetApiBaseForTests();
  });

  it('uses the hub worker autocomplete route', async () => {
    const fetchImpl = vi.fn(async (url) => {
      expect(String(url)).toContain('/api/address/autocomplete?');
      return Response.json({
        configured: true,
        suggestions: [{ id: 'abc', label: '41 Wagtail Way, Fareham' }]
      });
    });

    const result = await fetchAddressSuggestions('wagtail', 'GB', fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.suggestions).toHaveLength(1);
  });
});
