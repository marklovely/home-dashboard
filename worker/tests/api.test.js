import { describe, expect, it, vi } from 'vitest';
import { handleRequest } from '../src/index.js';
import { buildPrivateConfig } from '../src/routes/privateConfigRoute.js';
import { isAllowedButtonCode, normalizeButtonCode } from '../src/lib/buttonAllowlist.js';
import { resolveCorsOrigin } from '../src/lib/cors.js';
import { createAccessTestEnv, signTestAccessJwt, withAccessJwt } from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

const env = withTestLimiters(createAccessTestEnv());

async function authedRequest(url, init = {}, email = 'owner@example.com') {
  const token = await signTestAccessJwt(email, env);
  return new Request(url, withAccessJwt(token, init));
}

describe('health', () => {
  it('returns ok status', async () => {
    const response = await handleRequest(new Request('https://worker.test/api/health'), env);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'ok', service: 'lovely-home-hub-api' });
    expect(JSON.stringify(body)).not.toContain('test-access-code');
  });
});

describe('buttons', () => {
  it('accepts known button codes', async () => {
    expect(isAllowedButtonCode('VB01')).toBe(true);
    expect(normalizeButtonCode('vb9')).toBe('VB09');
  });

  it('rejects unknown buttons', async () => {
    const response = await handleRequest(
      await authedRequest('https://worker.test/api/button/VB99', { method: 'POST', body: '{}' }),
      env
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('UNKNOWN_BUTTON');
    expect(JSON.stringify(body)).not.toContain('test-access-code');
  });

  it('calls upstream with server-side access code', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const response = await handleRequest(
      await authedRequest('https://worker.test/api/button/VB01', { method: 'POST', body: '{}' }),
      env,
      fetchImpl
    );
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('accessCode=test-access-code');
    expect(url).toContain('virtualButton=1');
  });
});

describe('private-config', () => {
  it('returns expected shape without lockbox', async () => {
    const payload = buildPrivateConfig(env);
    expect(payload.wifi.ssid).toBe('Net');
    expect(payload.contacts.mark.phone).toBe('111');
    expect(payload.home.address).toBe('1 Road');
    expect(payload).not.toHaveProperty('lockbox');
  });

  it('requires Access authentication', async () => {
    const response = await handleRequest(new Request('https://worker.test/api/private-config'), env);
    expect(response.status).toBe(401);
  });

  it('returns config for authenticated user', async () => {
    const response = await handleRequest(
      await authedRequest('https://worker.test/api/private-config'),
      env
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.contacts.mark.name).toBe('Mark Lovely');
  });

  it('omits missing optional fields safely', () => {
    const payload = buildPrivateConfig({});
    expect(payload.wifi).toEqual({});
    expect(payload.contacts.mark.name).toBe('Mark Lovely');
  });
});

describe('cors', () => {
  it('allows configured origins', () => {
    expect(resolveCorsOrigin('http://localhost:5173', env.ALLOWED_ORIGINS)).toBe('http://localhost:5173');
  });

  it('rejects unknown origins', () => {
    expect(resolveCorsOrigin('https://evil.example', env.ALLOWED_ORIGINS)).toBeNull();
  });

  it('allows Cloudflare Pages preview hosts via wildcard', () => {
    expect(
      resolveCorsOrigin('https://feature-abc.home-dashboard.pages.dev', 'https://*.pages.dev')
    ).toBe('https://feature-abc.home-dashboard.pages.dev');
  });

  it('blocks disallowed browser origin on private-config', async () => {
    const response = await handleRequest(
      await authedRequest('https://worker.test/api/private-config', {
        headers: { Origin: 'https://evil.example' }
      }),
      env
    );
    expect(response.status).toBe(403);
  });

  it('allows Cf-Access-Jwt-Assertion on preflight', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/session', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'cf-access-jwt-assertion'
        }
      }),
      env
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')).toMatch(/Cf-Access-Jwt-Assertion/i);
  });
});

describe('owner auth', () => {
  it('returns 200 for correct PIN when Access identity is owner', async () => {
    const response = await handleRequest(
      await authedRequest('https://worker.test/api/auth/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
        body: JSON.stringify({ pin: '1234' })
      }),
      env
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.authenticated).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(typeof body.expiresAt).toBe('string');
    expect(JSON.stringify(body)).not.toContain('1234');
  });

  it('returns 401 for incorrect PIN', async () => {
    const response = await handleRequest(
      await authedRequest('https://worker.test/api/auth/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.2' },
        body: JSON.stringify({ pin: '0000' })
      }),
      env
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.authenticated).toBe(false);
    expect(body.error).toBe('Invalid credentials');
  });

  it('returns 400 for malformed PIN', async () => {
    const response = await handleRequest(
      await authedRequest('https://worker.test/api/auth/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '12' })
      }),
      env
    );
    expect(response.status).toBe(400);
  });

  it('returns 503 when OWNER_PIN secret is missing', async () => {
    const response = await handleRequest(
      await authedRequest('https://worker.test/api/auth/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '1234' })
      }),
      { ...env, OWNER_PIN: undefined }
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe('Owner access is unavailable');
  });

  it('rate limits after repeated failures', async () => {
    const limiterEnv = withTestLimiters(createAccessTestEnv());
    const requestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.99' },
      body: JSON.stringify({ pin: '0000' })
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await handleRequest(
        await authedRequest('https://worker.test/api/auth/owner', requestInit),
        limiterEnv
      );
      expect(response.status).toBe(401);
    }
    const blocked = await handleRequest(
      await authedRequest('https://worker.test/api/auth/owner', requestInit),
      limiterEnv
    );
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toMatch(/Too many attempts/i);
  });

  it('supports CORS preflight for allowed origins', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/auth/owner', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' }
      }),
      env
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });
});
