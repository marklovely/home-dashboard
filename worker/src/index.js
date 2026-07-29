import { corsHeaders, resolveCorsOrigin } from './lib/cors.js';
import { handleHealth } from './routes/health.js';
import { handlePrivateConfig } from './routes/privateConfig.js';
import { handleButtonPress } from './routes/buttons.js';
import { handleOwnerAuth } from './routes/ownerAuth.js';
import { methodNotAllowed, notFound } from './lib/errors.js';

/**
 * @param {string} [headerValue]
 */
function correlationIdFrom(headerValue) {
  if (headerValue?.trim()) return headerValue.trim().slice(0, 64);
  return crypto.randomUUID();
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleRequest(request, env, fetchImpl = fetch) {
  const correlationId = correlationIdFrom(request.headers.get('X-Correlation-Id'));
  const allowedOrigin = resolveCorsOrigin(request.headers.get('Origin') ?? undefined, env.ALLOWED_ORIGINS ?? '');

  if (request.method === 'OPTIONS') {
    if (!allowedOrigin) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
  }

  const attachCors = (response) => {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(allowedOrigin))) {
      headers.set(key, value);
    }
    headers.set('X-Correlation-Id', correlationId);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };

  if (request.headers.get('Origin') && !allowedOrigin) {
    return attachCors(new Response(JSON.stringify({ error: { code: 'CORS_REJECTED', message: 'Origin not allowed.' } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  const url = new URL(request.url);
  let response;

  if (url.pathname === '/api/health' && request.method === 'GET') {
    response = handleHealth();
  } else if (url.pathname === '/api/private-config' && request.method === 'GET') {
    response = handlePrivateConfig(env);
  } else if (url.pathname === '/api/auth/owner') {
    response = await handleOwnerAuth(request, correlationId);
  } else if (url.pathname.startsWith('/api/button/') && request.method === 'POST') {
    const buttonParam = decodeURIComponent(url.pathname.slice('/api/button/'.length));
    response = await handleButtonPress(request, buttonParam, env, correlationId, fetchImpl);
  } else if (url.pathname.startsWith('/api/button/')) {
    response = methodNotAllowed(correlationId);
  } else {
    response = notFound(correlationId);
  }

  safeLog(request.method, url.pathname, response.status, correlationId, url.pathname.includes('/api/button/') ? url.pathname.split('/').pop() : undefined);

  return attachCors(response);
}

/**
 * @param {string} method
 * @param {string} path
 * @param {number} status
 * @param {string} correlationId
 * @param {string | undefined} buttonCode
 */
function safeLog(method, path, status, correlationId, buttonCode) {
  const entry = {
    method,
    path,
    status,
    correlationId,
    ...(buttonCode ? { button: buttonCode } : {})
  };
  console.log(JSON.stringify(entry));
}

export default {
  async fetch(request, env, _ctx) {
    return handleRequest(request, env, fetch);
  }
};
