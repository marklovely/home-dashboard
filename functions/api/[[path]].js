/**
 * Same-origin API proxy (Cloudflare Pages Functions).
 * Forwards Cloudflare Access JWT to the Worker (header or CF_Authorization cookie).
 */

import { accessJwtProbe, extractAccessJwtFromRequest } from './accessJwtExtract.js';

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
 */
function buildForwardInit(request) {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (FORWARD_REQUEST_HEADERS.includes(lower) || lower.startsWith('cf-')) {
      headers.set(key, value);
    }
  }

  const jwt = extractAccessJwtFromRequest(request);
  if (jwt) {
    headers.set('Cf-Access-Jwt-Assertion', jwt);
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
 * @param {{ request: Request, env: Record<string, unknown>, params: { path?: string | string[] } }} context
 */
export async function onRequest(context) {
  const { request, env, params } = context;

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
    return Response.json(
      {
        ...probe,
        usesHubApiBinding: Boolean(
          env.HUB_API && typeof env.HUB_API === 'object' && 'fetch' in env.HUB_API
        ),
        usesWorkerOriginFallback: Boolean(workerApiOrigin(/** @type {Record<string, string | undefined>} */ (env)))
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const incoming = new URL(request.url);
  const pathAndQuery = `/api/${suffix}${incoming.search}`;
  const init = buildForwardInit(request);

  const hubApi = env.HUB_API;
  if (hubApi && typeof hubApi === 'object' && 'fetch' in hubApi && typeof hubApi.fetch === 'function') {
    const upstream = new Request(`https://hub.internal${pathAndQuery}`, init);
    return hubApi.fetch(upstream);
  }

  const origin = workerApiOrigin(/** @type {Record<string, string | undefined>} */ (env));
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
