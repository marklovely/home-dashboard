/** Must match worker/src/lib/deviceSession.js DEVICE_SESSION_SET_COOKIE_HEADER */
const DEVICE_SESSION_SET_COOKIE_HEADER = 'X-Device-Session-Set-Cookie';

/**
 * @param {Headers} headers
 * @returns {string[]}
 */
function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    const fromGetSetCookie = headers.getSetCookie();
    if (fromGetSetCookie.length > 0) {
      return fromGetSetCookie;
    }
  }

  const raw = headers.get('set-cookie');
  return raw ? [raw] : [];
}

/**
 * Preserve all upstream headers (especially multiple Set-Cookie values).
 * Service bindings may drop Set-Cookie; the Worker mirrors device session cookies
 * on X-Device-Session-Set-Cookie for the Pages proxy to apply.
 *
 * @param {Response} upstream
 */
export function proxyWorkerResponse(upstream) {
  const headers = new Headers(upstream.headers);
  const setCookies = extractSetCookies(upstream.headers);

  headers.delete('set-cookie');
  for (const cookie of setCookies) {
    headers.append('Set-Cookie', cookie);
  }

  const deviceSessionCookie = upstream.headers.get(DEVICE_SESSION_SET_COOKIE_HEADER);
  if (deviceSessionCookie) {
    const alreadyForwarded = setCookies.some((cookie) =>
      cookie.startsWith('lovely_home_device_session=')
    );
    if (!alreadyForwarded) {
      headers.append('Set-Cookie', deviceSessionCookie);
    }
    headers.delete(DEVICE_SESSION_SET_COOKIE_HEADER);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}
