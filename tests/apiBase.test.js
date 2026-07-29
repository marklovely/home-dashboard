import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ensureApiBaseUrl,
  buildApiUrl,
  getApiBaseUrl,
  isApiConfigured,
  resetApiBaseForTests
} from '../src/api/apiBase.js';

describe('apiBase', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetApiBaseForTests();
    vi.unstubAllGlobals();
  });

  it('trims build-time env URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', '  https://api.example.test/  ');
    expect(getApiBaseUrl()).toBe('https://api.example.test');
    expect(isApiConfigured()).toBe(true);
  });

  it('loads apiBaseUrl from runtime-config.json when env is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ apiBaseUrl: 'https://from-json.test/' })
      })
    );

    await ensureApiBaseUrl();

    expect(getApiBaseUrl()).toBe('https://from-json.test');
    expect(fetch).toHaveBeenCalledWith('./runtime-config.json', { cache: 'no-store' });
  });

  it('buildApiUrl uses same-origin when VITE_USE_PAGES_API_PROXY is true', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://worker.example.test');
    vi.stubEnv('VITE_USE_PAGES_API_PROXY', 'true');
    expect(buildApiUrl('/api/button/VB01')).toBe('/api/button/VB01');
  });

  it('buildApiUrl uses Worker base when proxy flag is off', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://worker.example.test');
    vi.stubEnv('VITE_USE_PAGES_API_PROXY', '');
    expect(buildApiUrl('/api/weather')).toBe('https://worker.example.test/api/weather');
  });
});
