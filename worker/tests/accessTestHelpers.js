import { SignJWT } from 'jose';
import {
  createOwnerClaims,
  createSitterClaims,
  DEVICE_SESSION_COOKIE,
  signDeviceSession
} from '../src/lib/deviceSession.js';

/**
 * @param {string} email
 * @param {Record<string, string | undefined>} env
 * @param {{ expOffsetSec?: number, aud?: string }} [options]
 */
export async function signTestAccessJwt(email, env, options = {}) {
  const secret = env.CF_ACCESS_JWT_TEST_SECRET?.trim();
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim() ?? 'test-team';
  const aud = options.aud ?? env.CF_ACCESS_AUD?.trim() ?? 'test-audience';
  if (!secret) {
    throw new Error('CF_ACCESS_JWT_TEST_SECRET is required for test JWTs');
  }

  const expOffsetSec = options.expOffsetSec ?? 300;
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(`https://${team}.cloudflareaccess.com`)
    .setAudience(aud)
    .setIssuedAt(now)
    .setExpirationTime(now + expOffsetSec)
    .sign(new TextEncoder().encode(secret));
}

/**
 * @param {Record<string, string | undefined>} overrides
 */
export function createAccessTestEnv(overrides = {}) {
  return {
    VIRTUAL_BUTTONS_ACCESS_CODE: 'test-access-code',
    ALLOWED_ORIGINS: 'https://app.example,http://localhost:5173',
    OWNER_PIN: '1234',
    OWNER_SESSION_SECRET: 'test-signing-secret-value',
    OWNER_EMAILS: 'owner@example.com',
    CF_ACCESS_TEAM_DOMAIN: 'test-team',
    CF_ACCESS_AUD: 'test-audience',
    CF_ACCESS_JWT_TEST_SECRET: 'unit-test-access-secret',
    PRIVATE_WIFI_SSID: 'Net',
    PRIVATE_WIFI_PASSWORD: 'Pass',
    PRIVATE_MARK_PHONE: '111',
    PRIVATE_MARK_EMAIL: 'mark@example.com',
    PRIVATE_DONNA_PHONE: '222',
    PRIVATE_DONNA_EMAIL: 'donna@example.com',
    PRIVATE_HOME_ADDRESS: '1 Road',
    ...overrides
  };
}

/**
 * @param {string} jwt
 * @param {RequestInit} [init]
 */
export function withAccessJwt(jwt, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cf-Access-Jwt-Assertion', jwt);
  if (init.method === 'POST' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return { ...init, headers };
}

/**
 * @param {string} jwt
 * @param {Record<string, string | undefined>} env
 * @param {'owner' | 'sitter'} [mode]
 * @param {number} [nowSec]
 * @param {RequestInit} [init]
 */
export async function withDeviceSessionCookie(jwt, env, mode = 'sitter', nowSec = Math.floor(Date.now() / 1000), init = {}) {
  const claims = mode === 'owner' ? createOwnerClaims(nowSec) : createSitterClaims(nowSec);
  const signed = await signDeviceSession(claims, env);
  const headers = new Headers(init.headers);
  headers.set('Cf-Access-Jwt-Assertion', jwt);
  headers.set('Cookie', `${DEVICE_SESSION_COOKIE}=${encodeURIComponent(signed ?? '')}`);
  if (init.method === 'POST' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return { ...init, headers };
}

/**
 * @param {string} url
 * @param {Record<string, string | undefined>} env
 * @param {RequestInit} [init]
 * @param {string} [email]
 */
export async function authedOwnerAccessRequest(url, env, init = {}, email = 'owner@example.com') {
  const jwt = await signTestAccessJwt(email, env);
  return new Request(url, withAccessJwt(jwt, init));
}
