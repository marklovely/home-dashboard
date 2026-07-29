import { afterEach, describe, expect, it, vi } from 'vitest';
import { ownerAuthProvider } from '../src/auth/OwnerAuthProvider.js';

describe('ownerAuthProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns unavailable without API base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    await expect(ownerAuthProvider.authenticate('1234')).resolves.toEqual({ status: 'unavailable' });
  });

  it('maps worker responses to UI results', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const cases = [
      [{ status: 200, ok: true, json: async () => ({ mode: 'owner', authenticated: true }) }, 'success'],
      [{ status: 401, ok: false }, 'invalid'],
      [{ status: 429, ok: false }, 'rate_limited'],
      [{ status: 503, ok: false }, 'unavailable']
    ];
    for (const [response, expected] of cases) {
      const fetchImpl = vi.fn().mockResolvedValue(response);
      await expect(ownerAuthProvider.authenticate('1234', fetchImpl)).resolves.toMatchObject({
        status: expected
      });
    }
  });
});
