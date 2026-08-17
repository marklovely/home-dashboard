import {
  fetchSiteAccessProbe,
  fetchSiteHealth,
  getSiteFromManifest,
  loadPlatformManifest,
  requirePlatformOperator
} from './platformApi.js';

/**
 * Platform operator API — /api/platform/*
 * Active only when PLATFORM_OPERATOR_EMAILS is set on the Pages project.
 *
 * @param {{ request: Request, env: Record<string, unknown>, params: { path?: string | string[] }, data?: unknown }} context
 */
export async function onRequest(context) {
  const { request, env, params, data } = context;
  const pagesEnv = /** @type {Record<string, string | undefined>} */ (env);

  const auth = await requirePlatformOperator(request, pagesEnv, data);
  if (!auth.ok) return auth.response;

  const suffix = normalizePath(params.path);

  let manifest;
  try {
    manifest = await loadPlatformManifest(request, env);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    return Response.json(
      {
        error: 'MANIFEST_UNAVAILABLE',
        message: `Could not load platform-manifest.json (${detail}). Rebuild with npm run build:platform.`
      },
      { status: 503 }
    );
  }

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
