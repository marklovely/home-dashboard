import { describe, expect, it } from 'vitest';
import { verifyHubAdminBearer } from '../src/lib/hubAdminAuth.js';

describe('hub admin bearer auth', () => {
  const env = { HUB_PROXY_SECRET: 'proxy-test-secret-value-12345' };

  it('accepts a matching bearer token', () => {
    const request = new Request('https://worker.test/api/demo/reseed', {
      method: 'POST',
      headers: { Authorization: 'Bearer proxy-test-secret-value-12345' }
    });
    expect(verifyHubAdminBearer(request, env)).toBe(true);
  });

  it('rejects missing or wrong bearer tokens', () => {
    expect(
      verifyHubAdminBearer(
        new Request('https://worker.test/api/demo/reseed', { method: 'POST' }),
        env
      )
    ).toBe(false);
    expect(
      verifyHubAdminBearer(
        new Request('https://worker.test/api/demo/reseed', {
          method: 'POST',
          headers: { Authorization: 'Bearer wrong-secret' }
        }),
        env
      )
    ).toBe(false);
  });
});
