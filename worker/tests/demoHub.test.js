import { describe, expect, it, vi } from 'vitest';
import {
  createDemoAuthCookie,
  demoAuthSetCookieHeader,
  demoCredentialsMatch,
  DEMO_AUTH_PROXY_COOKIE_FIELD,
  verifyDemoAuthCookie
} from '../src/lib/demoAuth.js';
import { DEVICE_SESSION_PROXY_COOKIE_FIELD } from '../src/lib/deviceSession.js';
import { buildDemoSeedPayload } from '../src/lib/demoSeed.js';
import * as demoSeed from '../src/lib/demoSeed.js';
import { getLondonDateKey, isDemoAuthEnabled, isDemoHubWorker } from '../src/lib/demoHub.js';
import { handleDemoLogin, handleDemoReseed, handleDemoSession } from '../src/routes/demoAuthRoute.js';
import { createTestOwnerAuthLimiter } from './testOwnerAuthLimiter.js';

const demoEnv = {
  HUB_ENVIRONMENT: 'demo',
  DEMO_AUTH_ENABLED: 'true',
  DEMO_USERNAME: 'demo',
  DEMO_PASSWORD: 'lovely-demo',
  HUB_PROXY_SECRET: 'test-demo-secret-at-least-32-chars-long',
  OWNER_EMAILS: 'demo@lovely-home.co.uk',
  OWNER_AUTH_LIMITER: createTestOwnerAuthLimiter()
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

  it('rate limits repeated failed logins', async () => {
    const requestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.55' },
      body: JSON.stringify({ username: 'demo', password: 'bad' })
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await handleDemoLogin(
        new Request('https://demo.test/api/demo/login', requestInit),
        demoEnv,
        'cid'
      );
      expect(response.status).toBe(401);
    }
    const blocked = await handleDemoLogin(
      new Request('https://demo.test/api/demo/login', requestInit),
      demoEnv,
      'cid'
    );
    expect(blocked.status).toBe(429);
  });

  it('embeds proxy cookie fields on successful login', async () => {
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
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(String(json[DEMO_AUTH_PROXY_COOKIE_FIELD] ?? '')).toContain('lovely_home_demo_auth=');
    expect(json[DEVICE_SESSION_PROXY_COOKIE_FIELD]).toBeUndefined();
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
    const loginJson = await login.json();
    const cookieMatch = String(loginJson[DEMO_AUTH_PROXY_COOKIE_FIELD] ?? '').match(/^[^;]+/);
    const cookiePair = cookieMatch?.[0] ?? '';
    const session = await handleDemoSession(
      new Request('https://demo.test/api/demo/session', {
        headers: { Cookie: cookiePair }
      }),
      demoEnv,
      'cid'
    );
    expect(session.status).toBe(200);
    expect(await session.json()).toEqual({ authenticated: true });
  });
});

describe('demo reseed route', () => {
  it('requires admin bearer auth', async () => {
    const unauthorized = await handleDemoReseed(
      new Request('https://demo.test/api/demo/reseed', { method: 'POST' }),
      demoEnv,
      'cid'
    );
    expect(unauthorized.status).toBe(401);

    const reseed = vi.spyOn(demoSeed, 'reseedDemoHub').mockResolvedValue(undefined);

    const authorized = await handleDemoReseed(
      new Request('https://demo.test/api/demo/reseed', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-demo-secret-at-least-32-chars-long' }
      }),
      demoEnv,
      'cid'
    );
    expect(authorized.status).toBe(200);
    expect(await authorized.json()).toEqual({ ok: true, reseeded: true });
    expect(reseed).toHaveBeenCalledOnce();
    reseed.mockRestore();
  });
});

describe('demo seed payload', () => {
  it('includes fictional demo home content without cameras enabled', () => {
    const payload = buildDemoSeedPayload();
    expect(payload.siteProfile?.hubName).toBe('Lovely Demo Home');
    expect(payload.siteProfile?.cameras?.enabled).toBe(false);
    expect(payload.hubSecrets?.owner_pin).toBe('1234');
    expect(payload.guide?.catalog?.categories?.some((category) => category.id === 'pets')).toBe(true);
    const pets = payload.guide?.catalog?.categories?.find((category) => category.id === 'pets');
    expect(pets?.title).toBe('Bailey');
    expect(pets?.topics?.some((topic) => topic.id === 'at-a-glance')).toBe(true);
  });
});
