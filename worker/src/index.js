import { corsHeaders, resolveCorsOrigin } from './lib/cors.js';
import { securityHeaders } from './lib/securityHeaders.js';
import { handleHealth } from './routes/health.js';
import { handlePrivateConfigRequest } from './routes/privateConfigRoute.js';
import { handleButtonPress } from './routes/buttons.js';
import { handleOwnerAuth } from './routes/ownerAuth.js';
import { handleWeather } from './routes/weather.js';
import { handleWeatherGeocode } from './routes/weatherGeocode.js';
import { handleCalendar } from './routes/calendar.js';
import { handleApplianceManuals } from './routes/applianceManuals.js';
import { handleHouseGuide } from './routes/houseGuide.js';
import {
  handleHouseSettingsGet,
  handleSitterAccessEmailsSetting,
  handleSitterSecretsSetting
} from './routes/houseSettingsRoute.js';
import { handleSiteBackup } from './routes/siteBackup.js';
import { handleSiteSetup } from './routes/siteSetupRoute.js';
import { handleBrandingLogo } from './routes/brandingRoute.js';
import { handleDeviceSession } from './routes/deviceSessionRoute.js';
import { handleDeviceMode, handleAuthLock } from './routes/deviceModeRoute.js';
import { handleSession } from './routes/session.js';
import { jsonError, methodNotAllowed, notFound } from './lib/errors.js';
import { bindFetch } from './lib/boundFetch.js';
import { isAccessConfigured } from './lib/accessJwt.js';

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
  const fetchBound = bindFetch(fetchImpl);
  const correlationId = correlationIdFrom(request.headers.get('X-Correlation-Id'));
  const allowedOrigin = resolveCorsOrigin(request.headers.get('Origin') ?? undefined, env.ALLOWED_ORIGINS ?? '');

  if (request.method === 'OPTIONS') {
    if (!allowedOrigin) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
  }

  const attachHeaders = (response) => {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(allowedOrigin))) {
      headers.set(key, value);
    }
    for (const [key, value] of Object.entries(securityHeaders())) {
      headers.set(key, value);
    }
    headers.set('X-Correlation-Id', correlationId);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };

  if (request.headers.get('Origin') && !allowedOrigin) {
    return attachHeaders(new Response(JSON.stringify({ error: { code: 'CORS_REJECTED', message: 'Origin not allowed.' } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  const url = new URL(request.url);
  let response;

  try {
    if (url.pathname === '/api/health' && request.method === 'GET') {
      response = handleHealth();
    } else if (!isAccessConfigured(env) && url.pathname.startsWith('/api/') && url.pathname !== '/api/health') {
      response = Response.json(
        { error: 'AUTH_NOT_CONFIGURED', message: 'Access authentication is not configured.' },
        { status: 503 }
      );
    } else if (url.pathname === '/api/branding/logo' && request.method === 'GET') {
      response = await handleBrandingLogo(request, env, fetchBound, correlationId);
    } else if (url.pathname === '/api/device-session' && request.method === 'GET') {
      response = await handleDeviceSession(request, env, fetchBound);
    } else if (url.pathname === '/api/device-mode' && request.method === 'POST') {
      response = await handleDeviceMode(request, env, fetchBound);
    } else if (url.pathname === '/api/auth/lock' && request.method === 'POST') {
      response = await handleAuthLock(request, env, fetchBound);
    } else if (url.pathname === '/api/session' && request.method === 'GET') {
      response = await handleSession(request, env, fetchBound);
    } else if (url.pathname === '/api/private-config' && request.method === 'GET') {
      response = await handlePrivateConfigRequest(request, env, fetchBound);
    } else if (url.pathname === '/api/weather/geocode' && request.method === 'GET') {
      response = await handleWeatherGeocode(request, env, fetchBound);
    } else if (url.pathname === '/api/weather' && request.method === 'GET') {
      response = await handleWeather(request, env, fetchBound);
    } else if (url.pathname === '/api/auth/owner') {
      response = await handleOwnerAuth(request, correlationId, env, fetchBound);
    } else if (url.pathname === '/api/calendar' && request.method === 'GET') {
      response = await handleCalendar(request, env, fetchBound);
    } else if (url.pathname.startsWith('/api/appliance-manuals')) {
      response = await handleApplianceManuals(request, url, env, correlationId);
    } else if (url.pathname === '/api/house-settings' && request.method === 'GET') {
      response = await handleHouseSettingsGet(request, env, fetchBound);
    } else if (url.pathname === '/api/house-settings/sitter-secrets' && request.method === 'POST') {
      response = await handleSitterSecretsSetting(request, env, fetchBound);
    } else if (url.pathname === '/api/house-settings/sitter-emails' && request.method === 'POST') {
      response = await handleSitterAccessEmailsSetting(request, env, fetchBound);
    } else if (url.pathname === '/api/site/backup' || url.pathname === '/api/site/restore') {
      response = await handleSiteBackup(request, url, env, correlationId);
    } else if (
      url.pathname === '/api/site/profile' ||
      url.pathname === '/api/site/secrets' ||
      url.pathname === '/api/site/secrets/status' ||
      url.pathname === '/api/site/reset'
    ) {
      response = await handleSiteSetup(request, url, env, correlationId);
    } else if (url.pathname.startsWith('/api/house-guide')) {
      response = await handleHouseGuide(request, url, env, correlationId);
    } else if (url.pathname.startsWith('/api/button/') && request.method === 'POST') {
      const buttonParam = decodeURIComponent(url.pathname.slice('/api/button/'.length));
      response = await handleButtonPress(request, buttonParam, env, correlationId, fetchBound);
    } else if (url.pathname.startsWith('/api/button/')) {
      response = methodNotAllowed(correlationId);
    } else {
      response = notFound(correlationId);
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'request_failed',
        path: url.pathname,
        method: request.method,
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
    response = jsonError(500, 'INTERNAL_ERROR', 'Request failed.', { correlationId });
  }

  safeLog(request.method, url.pathname, response.status, correlationId, url.pathname.includes('/api/button/') ? url.pathname.split('/').pop() : undefined);

  return attachHeaders(response);
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

export { OwnerAuthLimiter } from './durable/OwnerAuthLimiter.js';
export { ControlActionLimiter } from './durable/ControlActionLimiter.js';

export default {
  async fetch(request, env, _ctx) {
    return handleRequest(request, env, fetch);
  }
};
