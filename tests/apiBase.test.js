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

  it('buildApiUrl uses same-origin path when base is empty', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(buildApiUrl('/api/button/VB01')).toBe('/api/button/VB01');
  });

  it('buildApiUrl uses same-origin on Pages host even when VITE points at Worker', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://worker.example.test');
    vi.stubGlobal('location', { hostname: 'feature-branch.home-dashboard-a11.pages.dev' });
    expect(buildApiUrl('/api/weather')).toBe('/api/weather');
  });
});
