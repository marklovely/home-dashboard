import { describe, expect, it } from 'vitest';
import { proxyWorkerResponse } from '../functions/api/proxyWorkerResponse.js';

describe('proxyWorkerResponse', () => {
  it('forwards multiple Set-Cookie headers', async () => {
    const upstream = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: [
        ['Content-Type', 'application/json'],
        ['Set-Cookie', 'a=1; Path=/; HttpOnly'],
        ['Set-Cookie', 'b=2; Path=/; HttpOnly']
      ]
    });

    const proxied = proxyWorkerResponse(upstream);
    expect(proxied.headers.getSetCookie()).toEqual([
      'a=1; Path=/; HttpOnly',
      'b=2; Path=/; HttpOnly'
    ]);
  });

  it('does not strip Set-Cookie when getSetCookie returns empty', async () => {
    const upstream = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'a=1; Path=/; HttpOnly'
      }
    });

    upstream.headers.getSetCookie = () => [];

    const proxied = proxyWorkerResponse(upstream);
    expect(proxied.headers.getSetCookie()).toEqual(['a=1; Path=/; HttpOnly']);
  });

  it('applies device session cookie from X-Device-Session-Set-Cookie when Set-Cookie is missing', async () => {
    const deviceCookie =
      'lovely_home_device_session=token; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600';
    const upstream = new Response(JSON.stringify({ mode: 'sitter' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Session-Set-Cookie': deviceCookie
      }
    });

    const proxied = proxyWorkerResponse(upstream);
    expect(proxied.headers.getSetCookie()).toEqual([deviceCookie]);
    expect(proxied.headers.get('X-Device-Session-Set-Cookie')).toBeNull();
  });

  it('does not duplicate device session cookie when Set-Cookie already present', async () => {
    const deviceCookie =
      'lovely_home_device_session=token; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600';
    const upstream = new Response(JSON.stringify({ mode: 'sitter' }), {
      status: 200,
      headers: [
        ['Content-Type', 'application/json'],
        ['Set-Cookie', deviceCookie],
        ['X-Device-Session-Set-Cookie', deviceCookie]
      ]
    });

    const proxied = proxyWorkerResponse(upstream);
    expect(proxied.headers.getSetCookie()).toEqual([deviceCookie]);
  });
});
