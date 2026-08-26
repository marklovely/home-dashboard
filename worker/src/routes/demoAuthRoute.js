import {
  createDemoAuthCookie,
  demoAuthClearCookieHeader,
  demoAuthSetCookieHeader,
  demoCredentialsMatch,
  readDemoCredentials,
  verifyDemoAuthCookie
} from '../lib/demoAuth.js';
import { isDemoAuthEnabled } from '../lib/demoHub.js';
import { jsonError, methodNotAllowed } from '../lib/errors.js';
import { issueSitterSessionResponse } from '../lib/deviceSessionAuth.js';

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

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  const username = String(body?.username ?? '');
  const password = String(body?.password ?? '');
  if (!demoCredentialsMatch(env, username, password)) {
    return jsonError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.', { correlationId });
  }

  const cookieValue = await createDemoAuthCookie(env);
  if (!cookieValue) {
    return jsonError(503, 'UNAVAILABLE', 'Demo login is not configured.', { correlationId });
  }

  const sitterSession = await issueSitterSessionResponse(env);
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Set-Cookie': demoAuthSetCookieHeader(cookieValue)
  });
  const deviceCookie = sitterSession.headers.get('Set-Cookie');
  if (deviceCookie) {
    headers.append('Set-Cookie', deviceCookie);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
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

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Set-Cookie': demoAuthClearCookieHeader()
  });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
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
