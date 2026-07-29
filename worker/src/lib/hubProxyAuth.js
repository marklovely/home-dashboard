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
 * @param {string} a
 * @param {string} b
 */
function timingSafeEqualString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<string | null>}
 */
export async function verifyHubProxyAccessEmail(request, env) {
  const secret = env.HUB_PROXY_SECRET?.trim();
  if (!secret) return null;
  if (request.headers.get('X-Hub-Proxy-Auth') !== HUB_PROXY_AUTH_VERSION) return null;

  const email = request.headers.get('X-Hub-Access-Email')?.trim().toLowerCase();
  const tsRaw = request.headers.get('X-Hub-Access-Ts')?.trim();
  const sig = request.headers.get('X-Hub-Access-Sig')?.trim();
  if (!email || !tsRaw || !sig) return null;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 120) return null;

  const expected = await hmacSha256Base64Url(secret, `${email}|${tsRaw}`);
  if (!timingSafeEqualString(sig, expected)) return null;

  return email;
}
