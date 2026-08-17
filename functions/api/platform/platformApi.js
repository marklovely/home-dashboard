import { fetchAccessIdentityEmail } from '../accessIdentity.js';
import { middlewareAccessEmail } from '../middlewareAccess.js';

/**
 * @param {Record<string, string | undefined>} env
 * @returns {boolean}
 */
export function isPlatformAdminProject(env) {
  return Boolean(env.PLATFORM_OPERATOR_EMAILS?.trim());
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function operatorEmailAllowlist(env) {
  const raw = env.PLATFORM_OPERATOR_EMAILS?.trim() ?? '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {unknown} [middlewareData]
 * @returns {Promise<string | null>}
 */
export async function resolvePlatformOperatorEmail(request, env, middlewareData) {
  const fromMiddleware = middlewareAccessEmail(middlewareData);
  if (fromMiddleware) return fromMiddleware;
  return fetchAccessIdentityEmail(request, env);
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {unknown} [middlewareData]
 * @returns {Promise<{ ok: true, email: string } | { ok: false, response: Response }>}
 */
export async function requirePlatformOperator(request, env, middlewareData) {
  if (!isPlatformAdminProject(env)) {
    return {
      ok: false,
      response: Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    };
  }

  const allowlist = operatorEmailAllowlist(env);
  const email = await resolvePlatformOperatorEmail(request, env, middlewareData);

  if (allowlist.length === 0) {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'PLATFORM_NOT_CONFIGURED',
          message: 'Set PLATFORM_OPERATOR_EMAILS on the platform Pages project.'
        },
        { status: 503 }
      )
    };
  }

  if (!email) {
    return {
      ok: false,
      response: Response.json(
        { error: 'UNAUTHORIZED', message: 'Cloudflare Access login required.' },
        { status: 401 }
      )
    };
  }

  if (!allowlist.includes(email)) {
    return {
      ok: false,
      response: Response.json(
        { error: 'FORBIDDEN', message: 'Not a platform operator.' },
        { status: 403 }
      )
    };
  }

  return { ok: true, email };
}

/**
 * @param {Request} request
 * @returns {Promise<object>}
 */
export async function loadPlatformManifest(request) {
  const url = new URL('/platform-manifest.json', request.url);
  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Manifest fetch failed: ${response.status}`);
  }
  return response.json();
}

/**
 * @param {object} manifest
 * @param {string} siteId
 */
export function getSiteFromManifest(manifest, siteId) {
  return manifest.sites?.[siteId] ?? null;
}

/**
 * @param {Record<string, unknown>} site
 */
export async function fetchSiteHealth(site) {
  const origin = site.workerApiOrigin ?? site.pagesUrl;
  if (!origin) {
    return { ok: false, error: 'NO_ORIGIN' };
  }
  try {
    const response = await fetch(`${String(origin).replace(/\/$/, '')}/api/health`, {
      headers: { Accept: 'application/json' }
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * @param {Record<string, unknown>} site
 */
export async function fetchSiteAccessProbe(site) {
  const pagesUrl = site.pagesUrl;
  if (!pagesUrl) {
    return { ok: false, error: 'NO_PAGES_URL' };
  }
  try {
    const response = await fetch(`${String(pagesUrl).replace(/\/$/, '')}/api/access-probe`, {
      headers: { Accept: 'application/json' }
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
