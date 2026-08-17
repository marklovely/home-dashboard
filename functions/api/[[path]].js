/**
 * Same-origin API proxy (Cloudflare Pages Functions).
 * Forwards Cloudflare Access to the Worker (JWT, or signed proxy identity via get-identity).
 */

import { accessJwtProbe, extractAccessJwtFromRequest } from './accessJwtExtract.js';
import { fetchAccessIdentityEmail, listCookieNames, resolvePagesAccessIdentity } from './accessIdentity.js';
import { attachHubProxyAuthHeaders } from './hubProxySign.js';
import { middlewareAccessEmail, middlewareAccessValidated } from './middlewareAccess.js';
import { proxyWorkerResponse } from './proxyWorkerResponse.js';

/** @type {string[]} */
const FORWARD_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'authorization',
  'x-correlation-id',
  'cookie'
];

/**
 * @param {Record<string, string | undefined>} env
 */
function workerApiOrigin(env) {
  const raw = env.WORKER_API_ORIGIN ?? '';
  return String(raw).trim().replace(/\/$/, '');
}

/**
 * @param {string} pathParam
 */
function normalizePath(pathParam) {
  if (Array.isArray(pathParam)) return pathParam.map((segment) => String(segment)).join('/');
  if (pathParam) return String(pathParam);
  return '';
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {unknown} [middlewareData]
 */
async function buildForwardInit(request, env, middlewareData) {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (FORWARD_REQUEST_HEADERS.includes(lower) || lower.startsWith('cf-')) {
      headers.set(key, value);
    }
  }

  const middlewareEmail = middlewareAccessEmail(middlewareData);
  if (middlewareEmail) {
    await attachHubProxyAuthHeaders(headers, middlewareEmail, env);
  } else {
    const identity = await resolvePagesAccessIdentity(request, env);
    if (identity && 'jwt' in identity) {
      headers.set('Cf-Access-Jwt-Assertion', identity.jwt);
    } else if (identity && 'email' in identity) {
      await attachHubProxyAuthHeaders(headers, identity.email, env);
    } else {
      const jwt = extractAccessJwtFromRequest(request);
      if (jwt) headers.set('Cf-Access-Jwt-Assertion', jwt);
    }
  }

  /** @type {RequestInit} */
  const init = {
    method: request.method,
    headers,
    redirect: 'manual'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return init;
}

/**
 * @param {Record<string, unknown>} env
 */
async function fetchWorkerHealth(env) {
  const hubApi = env.HUB_API;
  if (hubApi && typeof hubApi === 'object' && 'fetch' in hubApi && typeof hubApi.fetch === 'function') {
    try {
      const response = await hubApi.fetch(new Request('https://hub.internal/api/health'));
      if (response.ok) return response.json();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {{ request: Request, env: Record<string, unknown>, params: { path?: string | string[] } }} context
 */
export async function onRequest(context) {
  const { request, env, params, data } = context;
  const pagesEnv = /** @type {Record<string, string | undefined>} */ (env);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, OPTIONS'
      }
    });
  }

  const suffix = normalizePath(params.path);

  // Platform admin uses /api/platform/* (functions/api/platform/[[path]].js).
  // If that route is missing, avoid falling through to the Worker proxy.
  if (suffix === 'platform' || suffix.startsWith('platform/')) {
    return Response.json(
      {
        error: {
          code: 'PLATFORM_API_UNAVAILABLE',
          message:
            'Platform API route not deployed. Redeploy with bash scripts/deploy-platform-admin.sh or ensure functions/api/platform exists in the build.'
        }
      },
      { status: 503 }
    );
  }

  if (suffix === 'access-probe' && request.method === 'GET') {
    const probe = accessJwtProbe(request);
    const getIdentityOk = Boolean(await fetchAccessIdentityEmail(request, pagesEnv));
    const workerHealth = await fetchWorkerHealth(env);
    return Response.json(
      {
        ...probe,
        hasCookieHeader: Boolean(request.headers.get('Cookie')?.trim()),
        cookieNames: listCookieNames(request),
        getIdentityOk,
        accessPluginConfigured: Boolean(
          pagesEnv.CF_ACCESS_TEAM_DOMAIN?.trim() && pagesEnv.CF_ACCESS_AUD_PAGES?.trim()
        ),
        middlewareAccessValidated: middlewareAccessValidated(data),
        middlewareEmailPresent: Boolean(middlewareAccessEmail(data)),
        hubProxySecretConfigured: Boolean(pagesEnv.HUB_PROXY_SECRET?.trim()),
        cfAccessTeamDomainConfigured: Boolean(pagesEnv.CF_ACCESS_TEAM_DOMAIN?.trim()),
        cfAccessAudPagesConfigured: Boolean(pagesEnv.CF_ACCESS_AUD_PAGES?.trim()),
        usesHubApiBinding: Boolean(
          env.HUB_API && typeof env.HUB_API === 'object' && 'fetch' in env.HUB_API
        ),
        usesWorkerOriginFallback: Boolean(workerApiOrigin(pagesEnv)),
        workerHealth,
        hints: {
          noCookies:
            'No Cookie header on /api — you may have an Access BYPASS for /api, or you opened this URL without completing Cloudflare login on this hostname. Remove /api bypass rules; load the dashboard home first, then retry.',
          pagesEnv:
            'Set Pages (Production): CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD_PAGES (Pages app AUD only), HUB_PROXY_SECRET (match Worker). Redeploy Pages.',
          workerEnv:
            'Worker: HUB_PROXY_SECRET + redeploy. workerHealth.apiVersion should be 2.',
          middleware:
            'After Pages env is set, /api/access-probe should show middlewareAccessValidated:true when logged in, or redirect to Cloudflare OTP — not anonymous JSON.'
        }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const incoming = new URL(request.url);
  const pathAndQuery = `/api/${suffix}${incoming.search}`;
  const init = await buildForwardInit(request, pagesEnv, data);

  const hubApi = env.HUB_API;
  if (hubApi && typeof hubApi === 'object' && 'fetch' in hubApi && typeof hubApi.fetch === 'function') {
    try {
      const upstream = new Request(`https://hub.internal${pathAndQuery}`, init);
      const response = await hubApi.fetch(upstream);
      return proxyWorkerResponse(response);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'hub_api_proxy_failed',
          path: pathAndQuery,
          detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
        })
      );
      return Response.json(
        {
          error: {
            code: 'UPSTREAM_UNAVAILABLE',
            message: 'Hub API is temporarily unavailable.'
          }
        },
        { status: 502 }
      );
    }
  }

  const origin = workerApiOrigin(pagesEnv);
  if (!origin) {
    return Response.json(
      {
        error: {
          code: 'PROXY_NOT_CONFIGURED',
          message:
            'Set WORKER_API_ORIGIN on the Pages project and add HUB_API service binding to lovely-home-hub-api (Pages → Settings → Bindings).'
        }
      },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${origin}${pathAndQuery}`, init);
    return proxyWorkerResponse(response);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'worker_origin_proxy_failed',
        path: pathAndQuery,
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
    return Response.json(
      {
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message: 'Hub API is temporarily unavailable.'
        }
      },
      { status: 502 }
    );
  }
}
