import { getSiteFromManifest, loadPlatformManifest } from '../lib/platformManifest.js';
import { requirePlatformOperator } from '../lib/operatorAuth.js';

/**
 * @param {import('@cloudflare/workers-types').EventContext<Record<string, unknown>, string, unknown>} context
 */
export async function onRequest(context) {
  const { request, env, params, data } = context;
  const auth = requirePlatformOperator(request, env, data);
  if (!auth.ok) return auth.response;

  const suffix = normalizePath(params.path);
  const manifest = await loadPlatformManifest(request);

  if (suffix === 'sites' && request.method === 'GET') {
    return Response.json({
      generatedAt: manifest.generatedAt,
      operator: auth.email,
      sites: manifest.sites
    });
  }

  const siteMatch = suffix.match(/^sites\/([^/]+)(?:\/(.*))?$/);
  if (siteMatch && request.method === 'GET') {
    const siteId = decodeURIComponent(siteMatch[1]);
    const action = siteMatch[2] ?? '';
    const site = getSiteFromManifest(manifest, siteId);
    if (!site) {
      return Response.json({ error: 'NOT_FOUND', message: `Unknown site: ${siteId}` }, { status: 404 });
    }

    if (!action) {
      return Response.json({ site });
    }

    if (action === 'health') {
      return Response.json(await fetchSiteHealth(site));
    }

    if (action === 'access-probe') {
      return Response.json(await fetchSiteAccessProbe(site));
    }
  }

  return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
}

/**
 * @param {string | string[] | undefined} pathParam
 */
function normalizePath(pathParam) {
  if (Array.isArray(pathParam)) return pathParam.map(String).join('/');
  return pathParam ? String(pathParam) : '';
}

/**
 * @param {Record<string, unknown>} site
 */
async function fetchSiteHealth(site) {
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
async function fetchSiteAccessProbe(site) {
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
