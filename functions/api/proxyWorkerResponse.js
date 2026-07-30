/** Must match worker/src/lib/deviceSession.js */
const DEVICE_SESSION_SET_COOKIE_HEADER = 'X-Device-Session-Set-Cookie';
const DEVICE_SESSION_PROXY_COOKIE_FIELD = '_setCookie';
const DEVICE_SESSION_COOKIE = 'lovely_home_device_session';

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
 * @param {string[]} cookies
 * @param {Headers} headers
 */
function appendDeviceSessionCookies(cookies, headers) {
  headers.delete('set-cookie');
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
}

/**
 * Preserve upstream headers and apply device session cookies for the browser.
 * Service bindings drop Set-Cookie; the Worker also embeds the cookie on `_setCookie`
 * in JSON responses for the Pages proxy to apply directly.
 *
 * @param {Response} upstream
 */
export async function proxyWorkerResponse(upstream) {
  const contentType = upstream.headers.get('content-type') ?? '';
  const headers = new Headers(upstream.headers);
  /** @type {string[]} */
  let deviceCookies = [];

  if (contentType.includes('application/json')) {
    const text = await upstream.text();
    let body = text;

    try {
      const json = JSON.parse(text);
      const proxyCookie = json[DEVICE_SESSION_PROXY_COOKIE_FIELD];
      if (typeof proxyCookie === 'string' && proxyCookie.startsWith(`${DEVICE_SESSION_COOKIE}=`)) {
        deviceCookies.push(proxyCookie);
        const { [DEVICE_SESSION_PROXY_COOKIE_FIELD]: _removed, ...rest } = json;
        body = JSON.stringify(rest);
        headers.set('content-type', 'application/json');
      }
    } catch {
      body = text;
    }

    headers.delete(DEVICE_SESSION_SET_COOKIE_HEADER);
    if (deviceCookies.length === 0) {
      const fallback = upstream.headers.get(DEVICE_SESSION_SET_COOKIE_HEADER);
      if (fallback) deviceCookies.push(fallback);
    }
    appendDeviceSessionCookies(deviceCookies, headers);
    headers.delete(DEVICE_SESSION_SET_COOKIE_HEADER);

    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers
    });
  }

  const setCookies = extractSetCookies(upstream.headers);
  appendDeviceSessionCookies(setCookies, headers);

  const deviceSessionCookie = upstream.headers.get(DEVICE_SESSION_SET_COOKIE_HEADER);
  if (
    deviceSessionCookie &&
    !setCookies.some((cookie) => cookie.startsWith(`${DEVICE_SESSION_COOKIE}=`))
  ) {
    headers.append('Set-Cookie', deviceSessionCookie);
  }

  headers.delete(DEVICE_SESSION_SET_COOKIE_HEADER);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}
