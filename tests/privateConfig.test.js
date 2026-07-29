import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  preloadPrivateConfig,
  resetPrivateConfigForTests,
  getPrivateConfigValue
} from '../src/services/privateConfigService.js';
import { getProtectedDisplayValue } from '../src/content/houseguide/privateContent.js';

describe('privateConfigService', () => {
  beforeEach(() => {
    resetPrivateConfigForTests();
    vi.unstubAllEnvs();
  });

  it('uses Worker values when API returns data', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        wifi: { ssid: 'TestNet', password: 'secret-pass' },
        contacts: { mark: { phone: '0123' } },
        home: { address: '1 Test Street' }
      })
    });

    await preloadPrivateConfig(fetchImpl);
    expect(getPrivateConfigValue('wifi.ssid')).toBe('TestNet');
    expect(getProtectedDisplayValue('wifi.password', 'wifi')).toBe('secret-pass');
    expect(localStorage.getItem('wifi.password')).toBeNull();
  });

  it('keeps safe placeholders when API fails', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });

    await preloadPrivateConfig(fetchImpl);
    expect(getProtectedDisplayValue('wifi.password', 'wifi')).toContain('secure house-sitter access');
  });
});
