import { describe, expect, it, vi } from 'vitest';
import { handleRequest } from '../src/index.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt,
  authedOwnerAccessRequest
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';
import { issueOwnerToken } from '../src/lib/ownerToken.js';

const baseEnv = withTestLimiters(createAccessTestEnv());

async function ownerJwt() {
  return signTestAccessJwt('owner@example.com', baseEnv);
}

async function sitterJwt() {
  return signTestAccessJwt('sitter@example.com', baseEnv);
}

describe('Cloudflare Access authentication', () => {
  it('returns 401 when Access JWT is missing on session', async () => {
    const response = await handleRequest(new Request('https://worker.test/api/session'), baseEnv);
    expect(response.status).toBe(401);
  });

  it('returns 401 for malformed JWT', async () => {
    const response = await handleRequest(
      new Request('https://worker.test/api/session', withAccessJwt('not-a-jwt')),
      baseEnv
    );
    expect(response.status).toBe(401);
  });

  it('returns 401 for expired JWT', async () => {
    const token = await signTestAccessJwt('owner@example.com', baseEnv, { expOffsetSec: -60 });
    const response = await handleRequest(
      new Request('https://worker.test/api/session', withAccessJwt(token)),
      baseEnv
    );
    expect(response.status).toBe(401);
  });

  it('returns 401 for incorrect audience', async () => {
    const token = await signTestAccessJwt('owner@example.com', baseEnv, { aud: 'wrong-audience' });
    const response = await handleRequest(
      new Request('https://worker.test/api/session', withAccessJwt(token)),
      baseEnv
    );
    expect(response.status).toBe(401);
  });

  it('accepts JWT when CF_ACCESS_AUD lists multiple audiences', async () => {
    const env = createAccessTestEnv({ CF_ACCESS_AUD: 'test-audience,pages-app-aud' });
    const token = await signTestAccessJwt('owner@example.com', env, { aud: 'pages-app-aud' });
    const response = await handleRequest(
      new Request('https://worker.test/api/session', withAccessJwt(token)),
      withTestLimiters(env)
    );
    expect(response.status).toBe(200);
  });

  it('returns house-sitter role for allowed non-owner email', async () => {
    const token = await sitterJwt();
    const response = await handleRequest(
      new Request('https://worker.test/api/session', withAccessJwt(token)),
      baseEnv
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ authenticated: true, role: 'house-sitter', displayName: null });
  });

  it('returns owner role for OWNER_EMAILS match', async () => {
    const token = await ownerJwt();
    const response = await handleRequest(
      new Request('https://worker.test/api/session', withAccessJwt(token)),
      baseEnv
    );
    const body = await response.json();
    expect(body.role).toBe('owner');
  });
});

describe('control authorization', () => {
  it('allows sitter to trigger permitted control', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ pressed: 1, timeStamp: 'now' })
    });
    const token = await sitterJwt();
    const response = await handleRequest(
      new Request(
        'https://worker.test/api/button/VB01',
        withAccessJwt(token, { method: 'POST', body: '{}' })
      ),
      baseEnv,
      fetchImpl
    );
    expect(response.status).toBe(200);
  });

  it('forbids sitter from owner-only control', async () => {
    const token = await sitterJwt();
    const response = await handleRequest(
      new Request(
        'https://worker.test/api/button/VB07',
        withAccessJwt(token, { method: 'POST', body: '{}' })
      ),
      baseEnv
    );
    expect(response.status).toBe(403);
  });

  it('rejects unknown button ID', async () => {
    const token = await ownerJwt();
    const response = await handleRequest(
      new Request(
        'https://worker.test/api/button/VB99',
        withAccessJwt(token, { method: 'POST', body: '{}' })
      ),
      baseEnv
    );
    expect(response.status).toBe(404);
  });

  it('rejects GET on button endpoint', async () => {
    const token = await ownerJwt();
    const response = await handleRequest(
      new Request('https://worker.test/api/button/VB01', withAccessJwt(token, { method: 'GET' })),
      baseEnv
    );
    expect(response.status).toBe(405);
  });

  it('ignores frontend-supplied role in owner auth body', async () => {
    const token = await sitterJwt();
    const response = await handleRequest(
      new Request(
        'https://worker.test/api/auth/owner',
        withAccessJwt(token, {
          method: 'POST',
          body: JSON.stringify({ pin: '1234', role: 'owner' })
        })
      ),
      baseEnv
    );
    expect(response.status).toBe(403);
  });

  it('throttles duplicate control within cooldown', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ pressed: 1, timeStamp: 'now' })
    });
    const token = await ownerJwt();
    const init = withAccessJwt(token, { method: 'POST', body: '{}' });
    const first = await handleRequest(new Request('https://worker.test/api/button/VB01', init), baseEnv, fetchImpl);
    const second = await handleRequest(new Request('https://worker.test/api/button/VB01', init), baseEnv, fetchImpl);
    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });
});

describe('calendar authorization', () => {
  it('forbids house sitter from calendar', async () => {
    const token = await sitterJwt();
    const response = await handleRequest(
      new Request('https://worker.test/api/calendar', withAccessJwt(token)),
      baseEnv
    );
    expect(response.status).toBe(403);
  });

  it('does not authorize calendar via legacy owner bearer alone', async () => {
    const session = await issueOwnerToken({ ...baseEnv, OWNER_SESSION_SECRET: 'signing-secret' });
    const response = await handleRequest(
      new Request('https://worker.test/api/calendar', {
        headers: { Authorization: `Bearer ${session?.token}` }
      }),
      baseEnv
    );
    expect(response.status).toBe(401);
  });

  it('allows Access owner without device cookie to reach calendar route', async () => {
    const response = await handleRequest(
      await authedOwnerAccessRequest('https://worker.test/api/calendar', {
        ...baseEnv,
        APPLE_CALENDAR_ICS_URL: 'https://calendar.example/private.ics'
      }),
      { ...baseEnv, APPLE_CALENDAR_ICS_URL: 'https://calendar.example/private.ics' },
      vi.fn(async () => new Response('BEGIN:VCALENDAR\nEND:VCALENDAR', { status: 200 }))
    );
    expect(response.status).toBe(200);
  });
});

describe('security headers', () => {
  it('includes security headers on API responses', async () => {
    const response = await handleRequest(new Request('https://worker.test/api/health'), baseEnv);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Strict-Transport-Security')).toMatch(/max-age=/);
  });
});
