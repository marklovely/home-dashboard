/**
 * Signed identity forwarded from Pages proxy when Access JWT is not visible on /api requests.
 */

export const HUB_PROXY_AUTH_VERSION = '1';

/**
 * @param {string} secret
 * @param {string} message
 */
async function hmacSha256Base64Url(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param {Headers} headers
 * @param {string} email
 * @param {Record<string, string | undefined>} env
 */
export async function attachHubProxyAuthHeaders(headers, email, env) {
  const secret = env.HUB_PROXY_SECRET?.trim();
  const normalized = email.trim().toLowerCase();
  if (!secret || !normalized) return false;

  const ts = String(Math.floor(Date.now() / 1000));
  const sig = await hmacSha256Base64Url(secret, `${normalized}|${ts}`);
  headers.set('X-Hub-Proxy-Auth', HUB_PROXY_AUTH_VERSION);
  headers.set('X-Hub-Access-Email', normalized);
  headers.set('X-Hub-Access-Ts', ts);
  headers.set('X-Hub-Access-Sig', sig);
  return true;
}
