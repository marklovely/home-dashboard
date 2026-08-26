import { describe, expect, it } from 'vitest';
import {
  createDemoAuthCookie,
  demoAuthSetCookieHeader,
  demoCredentialsMatch,
  verifyDemoAuthCookie
} from '../src/lib/demoAuth.js';
import { buildDemoSeedPayload } from '../src/lib/demoSeed.js';
import { getLondonDateKey, isDemoAuthEnabled, isDemoHubWorker } from '../src/lib/demoHub.js';
import { handleDemoLogin, handleDemoSession } from '../src/routes/demoAuthRoute.js';

const demoEnv = {
  HUB_ENVIRONMENT: 'demo',
  DEMO_AUTH_ENABLED: 'true',
  DEMO_USERNAME: 'demo',
  DEMO_PASSWORD: 'lovely-demo',
  HUB_PROXY_SECRET: 'test-demo-secret-at-least-32-chars-long',
  OWNER_EMAILS: 'demo@lovely-home.co.uk'
};

describe('demoHub helpers', () => {
  it('detects demo worker environment', () => {
    expect(isDemoHubWorker(demoEnv)).toBe(true);
    expect(isDemoAuthEnabled(demoEnv)).toBe(true);
    expect(isDemoHubWorker({ HUB_ENVIRONMENT: 'test' })).toBe(false);
  });

  it('formats London date keys', () => {
    const key = getLondonDateKey(new Date('2026-08-26T12:00:00Z'));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('demo credentials', () => {
  it('accepts configured username and password', () => {
    expect(demoCredentialsMatch(demoEnv, 'demo', 'lovely-demo')).toBe(true);
    expect(demoCredentialsMatch(demoEnv, 'demo', 'wrong')).toBe(false);
  });
});

describe('demo auth cookie', () => {
  it('issues and verifies a signed demo session cookie', async () => {
    const cookieValue = await createDemoAuthCookie(demoEnv);
    expect(cookieValue).toBeTruthy();

    const header = demoAuthSetCookieHeader(cookieValue ?? '');
    const token = decodeURIComponent(header.match(/=([^;]+)/)?.[1] ?? '');
    const authedRequest = new Request('https://demo.test/', {
      headers: { Cookie: `lovely_home_demo_auth=${encodeURIComponent(token)}` }
    });

    const session = await verifyDemoAuthCookie(authedRequest, demoEnv);
    expect(session.ok).toBe(true);
    expect(session.email).toBe('demo@lovely-home.co.uk');
    expect(session.role).toBe('owner');
  });
});

describe('demo login route', () => {
  it('returns 401 for invalid credentials', async () => {
    const response = await handleDemoLogin(
      new Request('https://demo.test/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'bad' })
      }),
      demoEnv,
      'cid'
    );
    expect(response.status).toBe(401);
  });

  it('sets cookies on successful login', async () => {
    const response = await handleDemoLogin(
      new Request('https://demo.test/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'lovely-demo' })
      }),
      demoEnv,
      'cid'
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('lovely_home_demo_auth=');
  });

  it('reports session state', async () => {
    const login = await handleDemoLogin(
      new Request('https://demo.test/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'lovely-demo' })
      }),
      demoEnv,
      'cid'
    );
    const cookie = login.headers.get('Set-Cookie') ?? '';
    const session = await handleDemoSession(
      new Request('https://demo.test/api/demo/session', { headers: { Cookie: cookie } }),
      demoEnv,
      'cid'
    );
    expect(session.status).toBe(200);
    expect(await session.json()).toEqual({ authenticated: true });
  });
});

describe('demo seed payload', () => {
  it('includes fictional demo home content without cameras enabled', () => {
    const payload = buildDemoSeedPayload();
    expect(payload.siteProfile?.hubName).toBe('Lovely Demo Home');
    expect(payload.siteProfile?.cameras?.enabled).toBe(false);
    expect(payload.hubSecrets?.owner_pin).toBe('1234');
    expect(payload.guide?.catalog?.categories?.some((category) => category.id === 'pets')).toBe(true);
  });
});
