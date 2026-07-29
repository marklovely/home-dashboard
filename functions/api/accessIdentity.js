import { extractAccessJwtFromRequest } from './accessJwtExtract.js';

/**
 * @param {Request} request
 * @returns {string[]}
 */
export function listCookieNames(request) {
  const raw = request.headers.get('Cookie') ?? '';
  /** @type {string[]} */
  const names = [];
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    names.push(part.slice(0, eq).trim());
  }
  return names;
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function fetchAccessIdentityEmail(request, env) {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  if (!team) return null;
  const cookie = request.headers.get('Cookie');
  if (!cookie?.trim()) return null;

  try {
    const response = await fetch(`https://${team}.cloudflareaccess.com/cdn-cgi/access/get-identity`, {
      headers: { Cookie: cookie, Accept: 'application/json' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
    return email || null;
  } catch {
    return null;
  }
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<{ jwt: string } | { email: string } | null>}
 */
export async function resolvePagesAccessIdentity(request, env) {
  const jwt = extractAccessJwtFromRequest(request);
  if (jwt) return { jwt };

  const email = await fetchAccessIdentityEmail(request, env);
  if (email) return { email };

  return null;
}
