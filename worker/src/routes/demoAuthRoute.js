import {
  createDemoAuthCookie,
  demoAuthClearCookieHeader,
  demoAuthSetCookieHeader,
  demoCredentialsMatch,
  DEMO_AUTH_PROXY_COOKIE_FIELD,
  readDemoCredentials,
  verifyDemoAuthCookie
} from '../lib/demoAuth.js';
import { isDemoAuthEnabled, isDemoHubWorker } from '../lib/demoHub.js';
import { verifyHubAdminBearer } from '../lib/hubAdminAuth.js';
import { jsonError, methodNotAllowed } from '../lib/errors.js';
import { issueSitterSessionResponse } from '../lib/deviceSessionAuth.js';
import { DEVICE_SESSION_PROXY_COOKIE_FIELD } from '../lib/deviceSession.js';
import {
  ensureRateLimitAllowed,
  recordRateLimitFailure,
  recordRateLimitSuccess
} from '../lib/rateLimitClient.js';
import { reseedDemoHub } from '../lib/demoSeed.js';

const DEMO_LOGIN_RATE_LIMIT_SCOPE = 'demo-login';

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleDemoLogin(request, env, correlationId) {
  if (!isDemoAuthEnabled(env)) {
    return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
  }
  if (request.method !== 'POST') return methodNotAllowed(correlationId);
  if (!readDemoCredentials(env)) {
    return jsonError(503, 'UNAVAILABLE', 'Demo login is not configured.', { correlationId });
  }

  if (!(await ensureRateLimitAllowed(request, env, DEMO_LOGIN_RATE_LIMIT_SCOPE))) {
    return jsonError(
      429,
      'RATE_LIMITED',
      'Too many failed sign-in attempts. Please wait before trying again.',
      { correlationId }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  const username = String(body?.username ?? '');
  const password = String(body?.password ?? '');
  if (!demoCredentialsMatch(env, username, password)) {
    await recordRateLimitFailure(request, env, DEMO_LOGIN_RATE_LIMIT_SCOPE);
    return jsonError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.', { correlationId });
  }

  await recordRateLimitSuccess(request, env, DEMO_LOGIN_RATE_LIMIT_SCOPE);

  const cookieValue = await createDemoAuthCookie(env);
  if (!cookieValue) {
    return jsonError(503, 'UNAVAILABLE', 'Demo login is not configured.', { correlationId });
  }

  const sitterSession = await issueSitterSessionResponse(env);

  /** @type {Record<string, unknown>} */
  const responseBody = {
    ok: true,
    [DEMO_AUTH_PROXY_COOKIE_FIELD]: demoAuthSetCookieHeader(cookieValue)
  };

  if (sitterSession.ok) {
    try {
      const sitterPayload = await sitterSession.json();
      const deviceCookie = sitterPayload[DEVICE_SESSION_PROXY_COOKIE_FIELD];
      if (typeof deviceCookie === 'string') {
        responseBody[DEVICE_SESSION_PROXY_COOKIE_FIELD] = deviceCookie;
      }
    } catch {
      /* device session is optional for demo login */
    }
  }

  return Response.json(responseBody, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleDemoLogout(request, env, correlationId) {
  if (!isDemoAuthEnabled(env)) {
    return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
  }
  if (request.method !== 'POST') return methodNotAllowed(correlationId);

  return Response.json(
    {
      ok: true,
      [DEMO_AUTH_PROXY_COOKIE_FIELD]: demoAuthClearCookieHeader()
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleDemoSession(request, env, correlationId) {
  if (!isDemoAuthEnabled(env)) {
    return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
  }
  if (request.method !== 'GET') return methodNotAllowed(correlationId);

  const session = await verifyDemoAuthCookie(request, env);
  return Response.json(
    { authenticated: session.ok },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleDemoReseed(request, env, correlationId) {
  if (!isDemoHubWorker(env)) {
    return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
  }
  if (request.method !== 'POST') return methodNotAllowed(correlationId);
  if (!verifyHubAdminBearer(request, env)) {
    return jsonError(401, 'UNAUTHORIZED', 'Admin authorization required.', { correlationId });
  }

  await reseedDemoHub(env);
  return Response.json(
    { ok: true, reseeded: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
