import { timingSafeEqualString } from './timingSafeEqual.js';
import { DEMO_AUTH_EMAIL, isDemoAuthEnabled } from './demoHub.js';
import { resolveRoleFromEmail } from './accessRoles.js';

export const DEMO_AUTH_COOKIE = 'lovely_home_demo_auth';
/** Pages proxy field when service bindings drop Set-Cookie on JSON responses. */
export const DEMO_AUTH_PROXY_COOKIE_FIELD = '_demoAuthCookie';
const DEMO_AUTH_TTL_SEC = 60 * 60 * 12;

/**
 * @param {Record<string, string | undefined>} env
 */
export function demoAuthSecret(env) {
  return env.DEMO_AUTH_SECRET?.trim() || env.HUB_PROXY_SECRET?.trim() || '';
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function readDemoCredentials(env) {
  const username = env.DEMO_USERNAME?.trim() ?? '';
  const password = env.DEMO_PASSWORD?.trim() ?? '';
  if (!username || !password) return null;
  return { username, password };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} username
 * @param {string} password
 */
export function demoCredentialsMatch(env, username, password) {
  const configured = readDemoCredentials(env);
  if (!configured) return false;
  return (
    timingSafeEqualString(configured.username, String(username ?? '').trim()) &&
    timingSafeEqualString(configured.password, String(password ?? ''))
  );
}

/**
 * @param {string} payload
 */
function base64UrlEncode(payload) {
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * @param {string} encoded
 */
function base64UrlDecode(encoded) {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ email: string, exp: number }} claims
 */
async function signDemoClaims(env, claims) {
  const secret = demoAuthSecret(env);
  if (!secret) return null;
  const payload = base64UrlEncode(JSON.stringify(claims));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sig = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${payload}.${sig}`;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} token
 */
async function verifyDemoToken(env, token) {
  const secret = demoAuthSecret(env);
  if (!secret || !token?.includes('.')) return null;
  const [payload, sig] = token.split('.', 2);
  if (!payload || !sig) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const expectedSigBytes = Uint8Array.from(base64UrlDecode(sig), (char) => char.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    expectedSigBytes,
    new TextEncoder().encode(payload)
  );
  if (!valid) return null;

  try {
    const claims = JSON.parse(base64UrlDecode(payload));
    if (!claims?.email || typeof claims.exp !== 'number') return null;
    if (claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, string | undefined>} env
 */
export async function createDemoAuthCookie(env) {
  const exp = Math.floor(Date.now() / 1000) + DEMO_AUTH_TTL_SEC;
  return signDemoClaims(env, { email: DEMO_AUTH_EMAIL, exp });
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function verifyDemoAuthCookie(request, env) {
  if (!isDemoAuthEnabled(env)) return { ok: false };
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${DEMO_AUTH_COOKIE}=([^;]+)`));
  const token = match?.[1] ? decodeURIComponent(match[1]) : '';
  const claims = await verifyDemoToken(env, token);
  if (!claims) return { ok: false };
  const role = resolveRoleFromEmail(String(claims.email), env);
  return { ok: true, email: String(claims.email), role };
}

/**
 * @param {string} cookieValue
 */
export function demoAuthSetCookieHeader(cookieValue) {
  return `${DEMO_AUTH_COOKIE}=${encodeURIComponent(cookieValue)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${DEMO_AUTH_TTL_SEC}`;
}

export function demoAuthClearCookieHeader() {
  return `${DEMO_AUTH_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
