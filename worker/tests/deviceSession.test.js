import { describe, expect, it, vi } from 'vitest';
import {
  DEVICE_SESSION_COOKIE,
  DEVICE_SESSION_SET_COOKIE_HEADER,
  SITTER_SESSION_TTL_SEC,
  createOwnerClaims,
  createSitterClaims,
  effectiveModeFromClaims,
  signDeviceSession,
  verifyDeviceSessionToken,
  resolveDeviceSession,
  buildDeviceSessionSetCookie,
  buildDeviceSessionClearCookie
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
  authedOwnerAccessRequest
} from './accessTestHelpers.js';
import { withTestLimiters } from './testEnv.js';

const env = withTestLimiters(createAccessTestEnv());

describe('device session signing', () => {
  it('defaults missing or invalid cookie to owner mode without issuing a cookie', async () => {
    const invalid = new Request('https://worker.test/api/device-session', {
      headers: { Cookie: `${DEVICE_SESSION_COOKIE}=not.valid` }
    });
    const session = await resolveDeviceSession(invalid, env);
    expect(session.mode).toBe('owner');
    expect(session.cookieValue).toBeNull();
    expect(session.clearCookie).toBe(true);

    const missing = new Request('https://worker.test/api/device-session');
    expect((await resolveDeviceSession(missing, env)).mode).toBe('owner');
  });

  it('returns sitter only for a valid sitter cookie', async () => {
    const nowSec = 1_700_000_000;
    const claims = createSitterClaims(nowSec);
    const token = await signDeviceSession(claims, env);
    const request = new Request('https://worker.test/', {
      headers: { Cookie: `${DEVICE_SESSION_COOKIE}=${encodeURIComponent(token ?? '')}` }
    });
    const session = await resolveDeviceSession(request, env, nowSec * 1000);
    expect(session.mode).toBe('sitter');
  });

  it('returns owner when sitter cookie expired', async () => {
    const issued = 1_700_000_000;
    const claims = createSitterClaims(issued);
    const token = await signDeviceSession(claims, env);
    const request = new Request('https://worker.test/', {
      headers: { Cookie: `${DEVICE_SESSION_COOKIE}=${encodeURIComponent(token ?? '')}` }
    });
    const after = (issued + SITTER_SESSION_TTL_SEC + 1) * 1000;
    const session = await resolveDeviceSession(request, env, after);
    expect(session.mode).toBe('owner');
    expect(session.clearCookie).toBe(true);
  });

  it('returns owner when legacy owner cookie expired', async () => {
    const issued = 1_700_000_000;
    const claims = createOwnerClaims(issued);
    expect(effectiveModeFromClaims(claims, issued + 4 * 60 * 60 + 1)).toBe('owner');
  });

  it('rejects tampered signature', async () => {
    const claims = createSitterClaims(Math.floor(Date.now() / 1000));
    const token = await signDeviceSession(claims, env);
    const tampered = `${token?.slice(0, -4)}aaaa`;
    expect(await verifyDeviceSessionToken(tampered ?? '', env)).toBeNull();
  });

  it('sets cookie flags on Set-Cookie', () => {
    expect(buildDeviceSessionSetCookie('signed.value', 3600)).toMatch(/HttpOnly/);
    expect(buildDeviceSessionClearCookie()).toMatch(/Max-Age=0/);
  });
});

describe('device session HTTP routes', () => {
  it('GET /api/device-session defaults to owner without sitter cookie', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleDeviceSession(
      new Request('https://worker.test/api/device-session', withAccessJwt(jwt)),
      env
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mode).toBe('owner');
    expect(body.authenticated).toBe(true);
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });

  it('owner PIN clears sitter lock and returns owner mode', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleOwnerAuth(
      new Request(
        'https://worker.test/api/auth/owner',
        await withDeviceSessionCookie(jwt, env, 'sitter', Math.floor(Date.now() / 1000), {
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
    expect(response.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
  });

  it('enabling sitter mode requires Access owner and no active sitter cookie', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleDeviceMode(
      new Request(
        'https://worker.test/api/device-mode',
        withAccessJwt(jwt, {
          method: 'POST',
          body: JSON.stringify({ mode: 'sitter' })
        })
      ),
      env
    );
    expect(response.status).toBe(200);
    expect((await response.json()).mode).toBe('sitter');
    expect(response.headers.get('Set-Cookie')).toMatch(new RegExp(`${DEVICE_SESSION_COOKIE}=`));
    expect(response.headers.get(DEVICE_SESSION_SET_COOKIE_HEADER)).toMatch(/SameSite=Lax/);
  });

  it('sitter cookie blocks calendar', async () => {
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

  it('Access owner without device cookie can access calendar', async () => {
    const calendarEnv = {
      ...env,
      APPLE_CALENDAR_ICS_URL: 'https://calendar.example/private.ics'
    };
    const response = await handleCalendar(
      await authedOwnerAccessRequest('https://worker.test/api/calendar', calendarEnv),
      calendarEnv,
      vi.fn(async () => new Response('BEGIN:VCALENDAR\nEND:VCALENDAR', { status: 200 }))
    );
    expect(response.status).toBe(200);
  });

  it('sitter cookie blocks private-config', async () => {
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

  it('lock endpoint issues sitter cookie', async () => {
    const jwt = await signTestAccessJwt('owner@example.com', env);
    const response = await handleAuthLock(
      new Request('https://worker.test/api/auth/lock', withAccessJwt(jwt, { method: 'POST' })),
      env
    );
    expect(response.status).toBe(200);
    expect((await response.json()).mode).toBe('sitter');
  });
});
