/**
 * Signed HTTP-only device session cookie (lovely_home_device_session).
 *
 * Only a deliberate **sitter** cookie restricts the tablet. Without a valid sitter cookie,
 * the device is in **owner** mode (Cloudflare Access still required for the site).
 */

export const DEVICE_SESSION_COOKIE = 'lovely_home_device_session';
/** Internal header for Pages proxy when Set-Cookie is dropped by service binding. */
export const DEVICE_SESSION_SET_COOKIE_HEADER = 'X-Device-Session-Set-Cookie';
/** JSON field stripped by Pages before the response reaches the browser. */
export const DEVICE_SESSION_PROXY_COOKIE_FIELD = '_setCookie';
export const DEVICE_SESSION_VERSION = 1;

/** 30 days */
export const SITTER_SESSION_TTL_SEC = 30 * 24 * 60 * 60;

/** 30 minutes inactivity (legacy owner PIN cookie only) */
export const OWNER_INACTIVITY_TTL_SEC = 30 * 60;

/** 4 hours absolute owner cap (legacy owner PIN cookie only) */
export const OWNER_ABSOLUTE_TTL_SEC = 4 * 60 * 60;

/**
 * @typedef {'sitter' | 'owner'} DeviceMode
 */

/**
 * @typedef {{ role?: 'owner' | 'house-sitter' }} AccessIdentity
 */

/**
 * @typedef {Object} DeviceSessionClaims
 * @property {DeviceMode} mode
 * @property {number} issuedAt
 * @property {number} expiresAt
 * @property {number} version
 * @property {number} [absoluteExpiresAt]
 */

import { getConfiguredOwnerPin, getOrCreateDeviceSessionSecret } from './hubSecrets.js';

/**
 * @param {Record<string, string | undefined>} env
 */
async function resolveSigningSecret(env) {
  const fromEnv = env.OWNER_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;

  const fromDb = await getOrCreateDeviceSessionSecret(env);
  if (fromDb) return fromDb;

  const pin = await getConfiguredOwnerPin(env);
  if (pin) return pin;

  return env.OWNER_PIN?.trim() || null;
}

/**
 * @param {ArrayBuffer} key
 * @param {string} data
 */
async function hmacSign(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

/**
 * @param {Uint8Array} bytes
 */
function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param {string} input
 */
function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * @param {DeviceSessionClaims} claims
 * @param {Record<string, string | undefined>} env
 */
export async function signDeviceSession(claims, env) {
  const secret = await resolveSigningSecret(env);
  if (!secret) return null;
  const payloadPart = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const keyBytes = new TextEncoder().encode(secret);
  const signature = await hmacSign(keyBytes.buffer, payloadPart);
  return `${payloadPart}.${base64UrlEncode(signature)}`;
}

/**
 * @param {string} token
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<DeviceSessionClaims | null>}
 */
export async function verifyDeviceSessionToken(token, env) {
  const secret = await resolveSigningSecret(env);
  if (!secret || !token) return null;

  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  const keyBytes = new TextEncoder().encode(secret);
  const expected = await hmacSign(keyBytes.buffer, payloadPart);
  try {
    const provided = base64UrlDecode(signaturePart);
    if (expected.length !== provided.length) return null;
    let diff = 0;
    for (let index = 0; index < expected.length; index += 1) {
      diff |= expected[index] ^ provided[index];
    }
    if (diff !== 0) return null;
  } catch {
    return null;
  }

  try {
    const json = new TextDecoder().decode(base64UrlDecode(payloadPart));
    const claims = /** @type {DeviceSessionClaims} */ (JSON.parse(json));
    if (claims.version !== DEVICE_SESSION_VERSION) return null;
    if (claims.mode !== 'sitter' && claims.mode !== 'owner') return null;
    if (typeof claims.issuedAt !== 'number' || typeof claims.expiresAt !== 'number') return null;
    return claims;
  } catch {
    return null;
  }
}

/**
 * Active sitter lock from a valid sitter cookie.
 *
 * @param {DeviceSessionClaims} claims
 * @param {number} nowSec
 */
export function isActiveSitterSession(claims, nowSec) {
  return claims.mode === 'sitter' && nowSec < claims.expiresAt;
}

/**
 * @param {DeviceSessionClaims} claims
 * @param {number} nowSec
 * @returns {DeviceMode}
 */
export function effectiveModeFromClaims(claims, nowSec) {
  if (isActiveSitterSession(claims, nowSec)) return 'sitter';
  return 'owner';
}

/**
 * @param {Request} request
 */
export function readDeviceSessionCookie(request) {
  const raw = request.headers.get('Cookie') ?? '';
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${DEVICE_SESSION_COOKIE}=`)) {
      const value = trimmed.slice(DEVICE_SESSION_COOKIE.length + 1);
      if (!value) return null;
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * @param {number} nowSec
 */
export function createSitterClaims(nowSec) {
  return /** @type {DeviceSessionClaims} */ ({
    mode: 'sitter',
    issuedAt: nowSec,
    expiresAt: nowSec + SITTER_SESSION_TTL_SEC,
    version: DEVICE_SESSION_VERSION
  });
}

/**
 * @param {number} nowSec
 */
export function createOwnerClaims(nowSec) {
  return /** @type {DeviceSessionClaims} */ ({
    mode: 'owner',
    issuedAt: nowSec,
    expiresAt: nowSec + OWNER_INACTIVITY_TTL_SEC,
    absoluteExpiresAt: nowSec + OWNER_ABSOLUTE_TTL_SEC,
    version: DEVICE_SESSION_VERSION
  });
}

/**
 * @param {DeviceSessionClaims} claims
 * @param {number} nowSec
 */
export function renewOwnerInactivity(claims, nowSec) {
  if (claims.mode !== 'owner') return claims;
  if (typeof claims.absoluteExpiresAt === 'number' && nowSec >= claims.absoluteExpiresAt) {
    return claims;
  }
  const inactivityExpires = nowSec + OWNER_INACTIVITY_TTL_SEC;
  const absoluteCap = claims.absoluteExpiresAt ?? nowSec + OWNER_ABSOLUTE_TTL_SEC;
  return {
    ...claims,
    expiresAt: Math.min(inactivityExpires, absoluteCap)
  };
}

/**
 * @returns {{ mode: DeviceMode, ownerSessionExpiresAtMs: null, claims: null, cookieValue: null, clearCookie: boolean }}
 */
export function defaultOwnerDeviceSession() {
  return {
    mode: /** @type {DeviceMode} */ ('owner'),
    ownerSessionExpiresAtMs: null,
    claims: null,
    cookieValue: null,
    clearCookie: false
  };
}

/**
 * Physical sitter lock cookie wins on a shared tablet. Otherwise Cloudflare Access
 * house-sitter identity forces sitter mode for remote sitter logins.
 *
 * @param {{ mode: DeviceMode }} session
 * @param {AccessIdentity | null | undefined} auth
 * @returns {DeviceMode}
 */
export function effectiveDeviceMode(session, auth) {
  if (session.mode === 'sitter') return 'sitter';
  if (auth?.role === 'house-sitter') return 'sitter';
  return 'owner';
}

/**
 * @param {{
 *   mode: DeviceMode,
 *   ownerSessionExpiresAtMs: number | null,
 *   claims?: DeviceSessionClaims | null,
 *   cookieValue?: string | null,
 *   clearCookie?: boolean
 * }} session
 * @param {AccessIdentity | null | undefined} auth
 */
export function withEffectiveDeviceMode(session, auth) {
  return {
    ...session,
    mode: effectiveDeviceMode(session, auth)
  };
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {AccessIdentity | null | undefined} auth
 * @param {number} [nowMs]
 */
export async function resolveAuthenticatedDeviceSession(request, env, auth, nowMs = Date.now()) {
  const session = await resolveDeviceSession(request, env, nowMs);
  return withEffectiveDeviceMode(session, auth);
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {number} [nowMs]
 */
export async function resolveDeviceSession(request, env, nowMs = Date.now()) {
  const nowSec = Math.floor(nowMs / 1000);
  const token = readDeviceSessionCookie(request);
  const hadCookie = Boolean(token);
  const claims = token ? await verifyDeviceSessionToken(token, env) : null;

  if (!claims) {
    return {
      ...defaultOwnerDeviceSession(),
      clearCookie: hadCookie
    };
  }

  if (isActiveSitterSession(claims, nowSec)) {
    let cookieValue = null;
    let nextClaims = claims;
    if (nowSec + SITTER_SESSION_TTL_SEC / 2 > claims.expiresAt) {
      nextClaims = createSitterClaims(nowSec);
      cookieValue = await signDeviceSession(nextClaims, env);
    }
    return {
      mode: /** @type {DeviceMode} */ ('sitter'),
      ownerSessionExpiresAtMs: null,
      claims: nextClaims,
      cookieValue,
      clearCookie: false
    };
  }

  return {
    ...defaultOwnerDeviceSession(),
    clearCookie: hadCookie
  };
}

/**
 * @param {string} value
 * @param {number} maxAgeSec
 */
export function buildDeviceSessionSetCookie(value, maxAgeSec) {
  return `${DEVICE_SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`;
}

export function buildDeviceSessionClearCookie() {
  return `${DEVICE_SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/**
 * @param {DeviceSessionClaims} claims
 */
export function cookieMaxAgeForClaims(claims) {
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.max(60, claims.expiresAt - nowSec);
}

/**
 * @param {{ mode: DeviceMode, ownerSessionExpiresAtMs: number | null }} session
 * @param {Record<string, unknown>} [extras]
 */
export function deviceSessionJsonBody(session, extras = {}) {
  return {
    authenticated: true,
    mode: session.mode,
    ownerSessionExpiresAt:
      session.ownerSessionExpiresAtMs != null
        ? new Date(session.ownerSessionExpiresAtMs).toISOString()
        : null,
    ...extras
  };
}

/**
 * @param {{ cookieValue?: string | null, claims?: DeviceSessionClaims | null, clearCookie?: boolean }} session
 * @returns {string | null}
 */
export function buildDeviceSessionCookieHeader(session) {
  if (session.clearCookie) {
    return buildDeviceSessionClearCookie();
  }
  if (session.cookieValue && session.claims) {
    return buildDeviceSessionSetCookie(
      session.cookieValue,
      cookieMaxAgeForClaims(session.claims)
    );
  }
  return null;
}

/**
 * @param {Record<string, unknown>} body
 * @param {string | null} cookieHeader
 */
export function withProxySetCookieField(body, cookieHeader) {
  if (!cookieHeader) return body;
  return { ...body, [DEVICE_SESSION_PROXY_COOKIE_FIELD]: cookieHeader };
}

/**
 * @param {{
 *   mode: DeviceMode,
 *   ownerSessionExpiresAtMs: number | null,
 *   cookieValue?: string | null,
 *   claims?: DeviceSessionClaims | null,
 *   clearCookie?: boolean
 * }} session
 * @param {number} [status]
 * @param {Record<string, unknown>} [extras]
 */
export function finalizeDeviceSessionJsonResponse(session, status = 200, extras = {}) {
  const cookieHeader = buildDeviceSessionCookieHeader(session);
  const body = deviceSessionJsonBody(session, extras);
  const payload = withProxySetCookieField(body, cookieHeader);
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (cookieHeader) {
    headers.append('Set-Cookie', cookieHeader);
    headers.set(DEVICE_SESSION_SET_COOKIE_HEADER, cookieHeader);
  }
  return Response.json(payload, { status, headers });
}

/**
 * @param {Response} response
 * @param {string | null} cookieValue
 * @param {DeviceSessionClaims} claims
 * @deprecated Prefer finalizeDeviceSessionJsonResponse
 */
export function attachDeviceSessionCookie(response, cookieValue, claims) {
  if (!cookieValue) return response;
  const cookieHeader = buildDeviceSessionSetCookie(cookieValue, cookieMaxAgeForClaims(claims));
  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', cookieHeader);
  headers.set(DEVICE_SESSION_SET_COOKIE_HEADER, cookieHeader);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * @param {Response} response
 * @deprecated Prefer finalizeDeviceSessionJsonResponse
 */
export function attachClearDeviceSessionCookie(response) {
  const cookieHeader = buildDeviceSessionClearCookie();
  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', cookieHeader);
  headers.set(DEVICE_SESSION_SET_COOKIE_HEADER, cookieHeader);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * @param {Response} response
 * @param {{ cookieValue?: string | null, claims?: DeviceSessionClaims | null, clearCookie?: boolean }} session
 * @deprecated Prefer finalizeDeviceSessionJsonResponse
 */
export function applyDeviceSessionHeaders(response, session) {
  let next = response;
  if (session.clearCookie) {
    next = attachClearDeviceSessionCookie(next);
  }
  if (session.cookieValue && session.claims) {
    next = attachDeviceSessionCookie(next, session.cookieValue, session.claims);
  }
  return next;
}
