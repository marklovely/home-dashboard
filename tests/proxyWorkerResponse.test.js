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
});
