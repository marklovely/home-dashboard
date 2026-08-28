/** Must match worker/src/lib/deviceSession.js */
const DEVICE_SESSION_SET_COOKIE_HEADER = 'X-Device-Session-Set-Cookie';
const DEVICE_SESSION_PROXY_COOKIE_FIELD = '_setCookie';
const DEVICE_SESSION_COOKIE = 'lovely_home_device_session';

/** Must match worker/src/lib/demoAuth.js */
const DEMO_AUTH_PROXY_COOKIE_FIELD = '_demoAuthCookie';
const DEMO_AUTH_COOKIE = 'lovely_home_demo_auth';

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
 * @param {string} cookie
 * @returns {string[]}
 */
function mergeSetCookie(cookies, cookie) {
  const name = cookie.split('=')[0]?.trim();
  if (!name) return cookies;
  const rest = cookies.filter((entry) => !entry.startsWith(`${name}=`));
  return [...rest, cookie];
}

/**
 * @param {string[]} cookies
 * @param {Headers} headers
 */
function applySetCookies(cookies, headers) {
  headers.delete('set-cookie');
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
}

/**
 * Preserve upstream headers and apply cookies embedded in JSON for the browser.
 * Service bindings drop Set-Cookie; the Worker embeds cookies on `_setCookie` /
 * `_demoAuthCookie` in JSON responses for the Pages proxy to apply directly.
 *
 * @param {Response} upstream
 */
export async function proxyWorkerResponse(upstream) {
  const contentType = upstream.headers.get('content-type') ?? '';
  const headers = new Headers(upstream.headers);
  let cookies = extractSetCookies(upstream.headers);

  if (contentType.includes('application/json')) {
    const text = await upstream.text();
    let body = text;

    try {
      const json = JSON.parse(text);
      /** @type {Record<string, unknown>} */
      const rest = { ...json };

      const deviceProxyCookie = json[DEVICE_SESSION_PROXY_COOKIE_FIELD];
      if (typeof deviceProxyCookie === 'string' && deviceProxyCookie.startsWith(`${DEVICE_SESSION_COOKIE}=`)) {
        cookies = mergeSetCookie(cookies, deviceProxyCookie);
        delete rest[DEVICE_SESSION_PROXY_COOKIE_FIELD];
      }

      const demoAuthProxyCookie = json[DEMO_AUTH_PROXY_COOKIE_FIELD];
      if (typeof demoAuthProxyCookie === 'string' && demoAuthProxyCookie.startsWith(`${DEMO_AUTH_COOKIE}=`)) {
        cookies = mergeSetCookie(cookies, demoAuthProxyCookie);
        delete rest[DEMO_AUTH_PROXY_COOKIE_FIELD];
      }

      body = JSON.stringify(rest);
      headers.set('content-type', 'application/json');
    } catch {
      body = text;
    }

    headers.delete(DEVICE_SESSION_SET_COOKIE_HEADER);
    if (
      cookies.every((cookie) => !cookie.startsWith(`${DEVICE_SESSION_COOKIE}=`))
    ) {
      const fallback = upstream.headers.get(DEVICE_SESSION_SET_COOKIE_HEADER);
      if (fallback) cookies = mergeSetCookie(cookies, fallback);
    }
    applySetCookies(cookies, headers);
    headers.delete(DEVICE_SESSION_SET_COOKIE_HEADER);

    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers
    });
  }

  const setCookies = extractSetCookies(upstream.headers);
  applySetCookies(setCookies, headers);

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
