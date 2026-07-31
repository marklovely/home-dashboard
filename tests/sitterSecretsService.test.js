import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  applySitterSecretsDisclosed,
  getSitterSecretsDisclosed,
  resetSitterSecretsForTests,
  setSitterSecretsDisclosed
} from '../src/services/sitterSecretsService.js';

describe('sitterSecretsService', () => {
  beforeEach(() => {
    resetSitterSecretsForTests();
    vi.unstubAllEnvs();
  });

  it('tracks server state from device session payloads', () => {
    applySitterSecretsDisclosed(true);
    expect(getSitterSecretsDisclosed()).toBe(true);
    applySitterSecretsDisclosed(false);
    expect(getSitterSecretsDisclosed()).toBe(false);
  });

  it('posts toggle updates to the Worker', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sitterSecretsDisclosed: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          wifi: { ssid: 'GuestNet', password: 'secret-pass' },
          contacts: {},
          home: {}
        })
      });

    const ok = await setSitterSecretsDisclosed(true, fetchImpl);
    expect(ok).toBe(true);
    expect(getSitterSecretsDisclosed()).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/api/house-settings/sitter-secrets',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
