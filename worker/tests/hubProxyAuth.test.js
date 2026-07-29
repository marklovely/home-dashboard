import { describe, expect, it } from 'vitest';
import { verifyHubProxyAccessEmail, HUB_PROXY_AUTH_VERSION } from '../src/lib/hubProxyAuth.js';
import { attachHubProxyAuthHeaders } from '../../functions/api/hubProxySign.js';

describe('hub proxy auth', () => {
  const env = { HUB_PROXY_SECRET: 'proxy-test-secret-value-12345' };

  it('accepts signed proxy headers on the Worker', async () => {
    const headers = new Headers();
    await attachHubProxyAuthHeaders(headers, 'owner@example.com', env);
    const request = new Request('https://worker.test/api/weather', { headers });
    const email = await verifyHubProxyAccessEmail(request, env);
    expect(email).toBe('owner@example.com');
    expect(headers.get('X-Hub-Proxy-Auth')).toBe(HUB_PROXY_AUTH_VERSION);
  });

  it('rejects tampered signatures', async () => {
    const headers = new Headers();
    await attachHubProxyAuthHeaders(headers, 'owner@example.com', env);
    headers.set('X-Hub-Access-Sig', 'bad');
    const request = new Request('https://worker.test/api/weather', { headers });
    expect(await verifyHubProxyAccessEmail(request, env)).toBeNull();
  });
});
