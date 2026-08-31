import { loadPlatformManifest } from '../platform/platformApi.js';
import { getPlatformBillingDb, getSiteBilling } from '../platform/platformBilling.js';
import {
  handlePublicHubSignup,
  isPublicSignupSlugAvailable,
  publicSignupConfigured,
  publicSignupCorsHeaders
} from '../platform/platformPublicSignup.js';
import { getPublicPlanPricing } from '../platform/platformPublicPricing.js';
import {
  buildPublicHubTrialStatus,
  publicHubTrialCorsHeaders
} from '../platform/platformPublicHubTrial.js';

/**
 * Public marketing-site API — /api/public/*
 * No Cloudflare Access. Enable with PUBLIC_SIGNUP_ENABLED on the platform Pages project.
 *
 * @param {{ request: Request, env: Record<string, unknown>, params: { path?: string | string[] } }} context
 */
export async function onRequest(context) {
  const { request, env, params } = context;
  const pagesEnv = /** @type {Record<string, string | undefined>} */ (env);
  const suffix = normalizePath(params.path);
  const cors = publicSignupCorsHeaders(request, pagesEnv);

  if (request.method === 'OPTIONS') {
    if (suffix === 'hub-trial-status') {
      const hubCors = publicHubTrialCorsHeaders(request);
      if (!hubCors.siteId) {
        return new Response(null, { status: 403, headers: hubCors.headers });
      }
      return new Response(null, { status: 204, headers: hubCors.headers });
    }
    return new Response(null, { status: 204, headers: cors });
  }

  if (suffix === 'hub-trial-status' && request.method === 'GET') {
    const hubCors = publicHubTrialCorsHeaders(request);
    if (!hubCors.siteId) {
      return Response.json(
        { error: 'ORIGIN_NOT_ALLOWED', trialing: false, trialEnd: null },
        { status: 403, headers: hubCors.headers }
      );
    }
    const db = getPlatformBillingDb(env);
    const row = db ? await getSiteBilling(db, hubCors.siteId) : null;
    return Response.json(buildPublicHubTrialStatus(row), {
      headers: { ...hubCors.headers, 'Cache-Control': 'no-store' }
    });
  }

  let manifest;
  try {
    manifest = await loadPlatformManifest(request, env);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    return Response.json(
      { error: 'MANIFEST_UNAVAILABLE', message: detail },
      { status: 503, headers: cors }
    );
  }

  if (suffix === 'signup/status' && request.method === 'GET') {
    return Response.json(
      {
        enabled: publicSignupConfigured(pagesEnv),
        marketingOrigin: pagesEnv.MARKETING_SITE_ORIGIN?.trim() || 'https://lovely-home.co.uk'
      },
      { headers: { ...cors, 'Cache-Control': 'no-store' } }
    );
  }

  if (suffix === 'signup/pricing' && request.method === 'GET') {
    try {
      const pricing = await getPublicPlanPricing(pagesEnv);
      return Response.json(pricing, {
        headers: { ...cors, 'Cache-Control': 'public, max-age=300' }
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      return Response.json(
        { error: 'PRICING_UNAVAILABLE', message: detail },
        { status: 503, headers: { ...cors, 'Cache-Control': 'no-store' } }
      );
    }
  }

  const slugMatch = suffix.match(/^signup\/slug\/([^/]+)$/);
  if (slugMatch && request.method === 'GET') {
    const siteId = decodeURIComponent(slugMatch[1]).trim().toLowerCase();
    const result = isPublicSignupSlugAvailable(manifest, siteId);
    return Response.json(
      {
        siteId,
        available: result.available,
        message: result.reason,
        hostname: result.available ? `${siteId}.lovely-hub.com` : null
      },
      { headers: { ...cors, 'Cache-Control': 'no-store' } }
    );
  }

  if (suffix === 'signup' && request.method === 'POST') {
    const body = await readJsonBody(request);
    const siteId = String(body.siteId ?? body.site_id ?? '').trim().toLowerCase();
    const customerEmail = String(body.customerEmail ?? body.email ?? '').trim().toLowerCase();
    const billingInterval = String(body.billingInterval ?? body.billing_interval ?? 'month').trim().toLowerCase();

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return Response.json(
        { error: 'INVALID_EMAIL', message: 'Enter a valid email address.' },
        { status: 400, headers: cors }
      );
    }

    const billingDb = getPlatformBillingDb(env);
    const result = await handlePublicHubSignup(pagesEnv, manifest, siteId, customerEmail, billingDb, billingInterval);
    return Response.json(result.body, { status: result.status, headers: cors });
  }

  return Response.json({ error: 'NOT_FOUND' }, { status: 404, headers: cors });
}

/**
 * @param {string | string[] | undefined} pathParam
 */
function normalizePath(pathParam) {
  if (Array.isArray(pathParam)) return pathParam.map(String).join('/');
  return pathParam ? String(pathParam) : '';
}

/**
 * @param {Request} request
 */
async function readJsonBody(request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' ? /** @type {Record<string, unknown>} */ (value) : {};
  } catch {
    return {};
  }
}
