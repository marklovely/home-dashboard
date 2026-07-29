import { describe, expect, it, vi } from 'vitest';
import {
  DEVICE_SESSION_COOKIE,
  createOwnerClaims,
  createSitterClaims,
  effectiveModeFromClaims,
  signDeviceSession,
  verifyDeviceSessionToken,
  resolveDeviceSession,
  buildDeviceSessionSetCookie
} from '../src/lib/deviceSession.js';
import { handleDeviceSession } from '../src/routes/deviceSessionRoute.js';
import { handleDeviceMode, handleAuthLock } from '../src/routes/deviceModeRoute.js';
import { handleOwnerAuth } from '../src/routes/ownerAuth.js';
import { handleCalendar } from '../src/routes/calendar.js';
import { handlePrivateConfigRequest } from '../src/routes/privateConfigRoute.js';
import {
  createAccessTestEnv,
  signTestAccessJwt,
  withAccessJwt,
  withDeviceSessionCookie,
  authedOwnerDeviceRequest
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

const env = withTestLimiters(createAccessTestEnv());

describe('device session signing', () => {
  it('defaults invalid cookie to sitter mode on resolve', async () => {
    const request = new Request('https://worker.test/api/device-session', {
      headers: { Cookie: `${DEVICE_SESSION_COOKIE}=not.valid` }
    });
    const session = await resolveDeviceSession(request, env);
    expect(session.mode).toBe('sitter');
  });

  it('returns sitter for valid sitter cookie', async () => {
    const nowSec = 1_700_000_000;
    const claims = createSitterClaims(nowSec);
    const token = await signDeviceSession(claims, env);
    const request = new Request('https://worker.test/', {
      headers: { Cookie: `${DEVICE_SESSION_COOKIE}=${encodeURIComponent(token ?? '')}` }
    });
    const session = await resolveDeviceSession(request, env, nowSec * 1000);
    expect(session.mode).toBe('sitter');
  });

  it('returns owner for valid owner cookie before expiry', async () => {
    const nowSec = 1_700_000_000;
    const claims = createOwnerClaims(nowSec);
    const token = await signDeviceSession(claims, env);
    const request = new Request('https://worker.test/', {
      headers: { Cookie: `${DEVICE_SESSION_COOKIE}=${encodeURIComponent(token ?? '')}` }
    });
    const session = await resolveDeviceSession(request, env, nowSec * 1000);
    expect(session.mode).toBe('owner');
  });

  it('defaults expired owner inactivity to sitter', async () => {
    const issued = 1_700_000_000;
    const claims = createOwnerClaims(issued);
    const token = await signDeviceSession(claims, env);
    const afterInactivity = (issued + 31 * 60) * 1000;
    const request = new Request('https://worker.test/', {
      headers: { Cookie: `${DEVICE_SESSION_COOKIE}=${encodeURIComponent(token ?? '')}` }
    });
    const session = await resolveDeviceSession(request, env, afterInactivity);
    expect(session.mode).toBe('sitter');
  });

  it('defaults absolute owner expiry to sitter', async () => {
    const issued = 1_700_000_000;
    const claims = createOwnerClaims(issued);
    expect(effectiveModeFromClaims(claims, issued + 4 * 60 * 60 + 1)).toBe('sitter');
  });

  it('rejects tampered signature', async () => {
    const claims = createSitterClaims(Math.floor(Date.now() / 1000));
    const token = await signDeviceSession(claims, env);
    const tampered = `${token?.slice(0, -4)}aaaa`;
    const verified = await verifyDeviceSessionToken(tampered ?? '', env);
    expect(verified).toBeNull();
  });

  it('sets cookie flags on Set-Cookie', () => {
    const header = buildDeviceSessionSetCookie('signed.value', 3600);
    expect(header).toMatch(/HttpOnly/);
    expect(header).toMatch(/Secure/);
    expect(header).toMatch(/SameSite=Strict/);
    expect(header).toMatch(/Path=\//);
  });
});

describe('device session HTTP routes', () => {
  it('GET /api/device-session uses Cache-Control no-store', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleDeviceSession(
      new Request('https://worker.test/api/device-session', withAccessJwt(jwt)),
      env
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json();
    expect(body.mode).toBe('sitter');
    expect(body.authenticated).toBe(true);
  });

  it('owner PIN issues owner mode session without PIN in body', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleOwnerAuth(
      new Request(
        'https://worker.test/api/auth/owner',
        withAccessJwt(jwt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.50' },
          body: JSON.stringify({ pin: '1234' })
        })
      ),
      'cid',
      env
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mode).toBe('owner');
    expect(JSON.stringify(body)).not.toContain('1234');
    expect(response.headers.get('Set-Cookie')).toMatch(DEVICE_SESSION_COOKIE);
  });

  it('incorrect PIN is rejected', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleOwnerAuth(
      new Request(
        'https://worker.test/api/auth/owner',
        withAccessJwt(jwt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.51' },
          body: JSON.stringify({ pin: '9999' })
        })
      ),
      'cid',
      env
    );
    expect(response.status).toBe(401);
  });

  it('enabling sitter mode requires owner device session', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleDeviceMode(
      new Request(
        'https://worker.test/api/device-mode',
        await withDeviceSessionCookie(jwt, env, 'owner', Math.floor(Date.now() / 1000), {
          method: 'POST',
          body: JSON.stringify({ mode: 'sitter' })
        })
      ),
      env
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mode).toBe('sitter');
  });

  it('sitter device mode cannot access calendar', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleCalendar(
      new Request(
        'https://worker.test/api/calendar',
        await withDeviceSessionCookie(jwt, env, 'sitter')
      ),
      { ...env, APPLE_CALENDAR_ICS_URL: 'https://calendar.example/private.ics' }
    );
    expect(response.status).toBe(403);
  });

  it('owner device mode can access calendar with Access owner', async () => {
    const response = await handleCalendar(
      await authedOwnerDeviceRequest('https://worker.test/api/calendar', {
        ...env,
        APPLE_CALENDAR_ICS_URL: 'https://calendar.example/private.ics'
      }),
      env,
      vi.fn(async () => new Response('BEGIN:VCALENDAR\nEND:VCALENDAR', { status: 200 }))
    );
    expect(response.status).not.toBe(403);
  });

  it('sitter mode cannot access private-config', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handlePrivateConfigRequest(
      new Request(
        'https://worker.test/api/private-config',
        await withDeviceSessionCookie(jwt, env, 'sitter')
      ),
      env
    );
    expect(response.status).toBe(403);
  });

  it('lock endpoint returns sitter session', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAuthLock(
      new Request('https://worker.test/api/auth/lock', withAccessJwt(jwt, { method: 'POST' })),
      env
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mode).toBe('sitter');
  });
});
