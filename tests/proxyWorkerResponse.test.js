import { describe, expect, it } from 'vitest';
import { proxyWorkerResponse } from '../functions/api/proxyWorkerResponse.js';

describe('proxyWorkerResponse', () => {
  it('does not strip Set-Cookie when getSetCookie returns empty on JSON without _setCookie', async () => {
    const upstream = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'a=1; Path=/; HttpOnly'
      }
    });

    upstream.headers.getSetCookie = () => [];

    const proxied = await proxyWorkerResponse(upstream);
    expect(proxied.headers.getSetCookie()).toEqual([]);
  });

  it('applies device session cookie from JSON _setCookie and strips it from the body', async () => {
    const deviceCookie =
      'lovely_home_device_session=token; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600';
    const upstream = new Response(
      JSON.stringify({
        authenticated: true,
        mode: 'sitter',
        ownerSessionExpiresAt: null,
        _setCookie: deviceCookie
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const proxied = await proxyWorkerResponse(upstream);
    expect(proxied.headers.getSetCookie()).toEqual([deviceCookie]);
    expect(await proxied.json()).toEqual({
      authenticated: true,
      mode: 'sitter',
      ownerSessionExpiresAt: null
    });
  });

  it('applies device session cookie from X-Device-Session-Set-Cookie when JSON field is missing', async () => {
    const deviceCookie =
      'lovely_home_device_session=token; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600';
    const upstream = new Response(JSON.stringify({ mode: 'sitter' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Session-Set-Cookie': deviceCookie
      }
    });

    const proxied = await proxyWorkerResponse(upstream);
    expect(proxied.headers.getSetCookie()).toEqual([deviceCookie]);
    expect(proxied.headers.get('X-Device-Session-Set-Cookie')).toBeNull();
  });

  it('does not duplicate device session cookie when Set-Cookie already present on non-JSON responses', async () => {
    const deviceCookie =
      'lovely_home_device_session=token; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600';
    const upstream = new Response('ok', {
      status: 200,
      headers: [
        ['Set-Cookie', deviceCookie],
        ['X-Device-Session-Set-Cookie', deviceCookie]
      ]
    });

    const proxied = await proxyWorkerResponse(upstream);
    expect(proxied.headers.getSetCookie()).toEqual([deviceCookie]);
  });
});
