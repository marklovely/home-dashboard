import { createRemoteJWKSet, jwtVerify } from 'jose';
import { normalizeEmail } from './accessRoles.js';

/** @type {Map<string, ReturnType<typeof createRemoteJWKSet>>} */
const jwksCache = new Map();

/**
 * @param {Record<string, string | undefined>} env
 */
export function isAccessConfigured(env) {
  return Boolean(env.CF_ACCESS_TEAM_DOMAIN?.trim() && env.CF_ACCESS_AUD?.trim());
}

/**
 * @param {Record<string, string | undefined>} env
 */
function accessIssuer(env) {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  return `https://${team}.cloudflareaccess.com`;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
function getJwks(env, _fetchImpl) {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const url = `https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`;
  if (!jwksCache.has(url)) {
    jwksCache.set(url, createRemoteJWKSet(new URL(url)));
  }
  return jwksCache.get(url);
}

/**
 * @param {string} token
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{ ok: true, email: string } | { ok: false }>}
 */
export async function verifyAccessJwt(token, env, fetchImpl = fetch) {
  if (!isAccessConfigured(env)) {
    return { ok: false };
  }

  const issuer = accessIssuer(env);
  const audience = env.CF_ACCESS_AUD?.trim() ?? '';

  const testSecret = env.CF_ACCESS_JWT_TEST_SECRET?.trim();
  if (testSecret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(testSecret), {
        algorithms: ['HS256'],
        issuer,
        audience
      });
      const email = normalizeEmail(typeof payload.email === 'string' ? payload.email : '');
      if (!email) return { ok: false };
      return { ok: true, email };
    } catch {
      /* fall through to Cloudflare JWKS */
    }
  }

  try {
    const jwks = getJwks(env, fetchImpl);
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience
    });
    const email = normalizeEmail(typeof payload.email === 'string' ? payload.email : '');
    if (!email) return { ok: false };
    return { ok: true, email };
  } catch {
    return { ok: false };
  }
}
