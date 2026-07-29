/**
 * Same-origin API proxy (Cloudflare Pages Functions).
 * Forwards Cloudflare Access to the Worker (JWT, or signed proxy identity via get-identity).
 */

import { accessJwtProbe, extractAccessJwtFromRequest } from './accessJwtExtract.js';
import { fetchAccessIdentityEmail, listCookieNames, resolvePagesAccessIdentity } from './accessIdentity.js';
import { attachHubProxyAuthHeaders } from './hubProxySign.js';

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
 */
async function buildForwardInit(request, env) {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (FORWARD_REQUEST_HEADERS.includes(lower) || lower.startsWith('cf-')) {
      headers.set(key, value);
    }
  }

  const identity = await resolvePagesAccessIdentity(request, env);
  if (identity && 'jwt' in identity) {
    headers.set('Cf-Access-Jwt-Assertion', identity.jwt);
  } else if (identity && 'email' in identity) {
    await attachHubProxyAuthHeaders(headers, identity.email, env);
  } else {
    const jwt = extractAccessJwtFromRequest(request);
    if (jwt) headers.set('Cf-Access-Jwt-Assertion', jwt);
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
  const { request, env, params } = context;
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
        hubProxySecretConfigured: Boolean(pagesEnv.HUB_PROXY_SECRET?.trim()),
        cfAccessTeamDomainConfigured: Boolean(pagesEnv.CF_ACCESS_TEAM_DOMAIN?.trim()),
        usesHubApiBinding: Boolean(
          env.HUB_API && typeof env.HUB_API === 'object' && 'fetch' in env.HUB_API
        ),
        usesWorkerOriginFallback: Boolean(workerApiOrigin(pagesEnv)),
        workerHealth,
        hints: {
          deviceSession404: 'Deploy latest lovely-home-hub-api Worker (apiVersion 2 includes /api/device-session).',
          canForwardJwtFalse:
            'Set Pages env CF_ACCESS_TEAM_DOMAIN + HUB_PROXY_SECRET (same value as Worker secret), redeploy Pages and Worker.'
        }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const incoming = new URL(request.url);
  const pathAndQuery = `/api/${suffix}${incoming.search}`;
  const init = await buildForwardInit(request, pagesEnv);

  const hubApi = env.HUB_API;
  if (hubApi && typeof hubApi === 'object' && 'fetch' in hubApi && typeof hubApi.fetch === 'function') {
    const upstream = new Request(`https://hub.internal${pathAndQuery}`, init);
    return hubApi.fetch(upstream);
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

  return fetch(`${origin}${pathAndQuery}`, init);
}
