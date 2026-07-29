/**
 * Same-origin API proxy (Cloudflare Pages Functions).
 *
 * Browser calls /api/* on the Pages hostname so POST controls are not blocked by
 * Access CORS preflight on *.workers.dev. Forwards Cf-Access-Jwt-Assertion to the Worker.
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
  const raw = env.WORKER_API_ORIGIN ?? env.VITE_API_BASE_URL ?? '';
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
 * @param {{ request: Request, env: Record<string, string | undefined>, params: { path?: string | string[] } }} context
 */
export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = workerApiOrigin(env);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, OPTIONS'
      }
    });
  }

  if (!origin) {
    return Response.json(
      { error: { code: 'PROXY_NOT_CONFIGURED', message: 'WORKER_API_ORIGIN is not set on Pages.' } },
      { status: 503 }
    );
  }

  const suffix = normalizePath(params.path);
  const incoming = new URL(request.url);
  const target = `${origin}/api/${suffix}${incoming.search}`;

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

  return fetch(target, init);
}
