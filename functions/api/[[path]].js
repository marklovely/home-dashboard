/**
 * Same-origin API proxy (Cloudflare Pages Functions).
 * Forwards Cf-Access-Jwt-Assertion from the Pages Access session to the Worker.
 */

/** @type {string[]} */
const FORWARD_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'cf-access-jwt-assertion',
  'authorization',
  'x-correlation-id'
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
    if (FORWARD_REQUEST_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
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
