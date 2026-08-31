import {
  createBillingCheckoutSession,
  getSiteBilling,
  stripeBillingConfigured,
  TRIAL_PERIOD_DAYS,
  validateBillingSiteId
} from './platformBilling.js';
import { githubAutomationConfigured } from './platformGitHub.js';
import { getSiteFromManifest } from './platformApi.js';
import {
  consumeSignupAttempt,
  getActiveSignupReservation,
  hashSignupClientKey,
  pruneExpiredSignupData,
  reserveSignupSlug
} from './platformSignupGuards.js';
import { turnstileConfigured, verifyTurnstileToken } from './platformSignupTurnstile.js';

/** Reserved slugs — internal hubs and common DNS names. */
export const PUBLIC_SIGNUP_BLOCKED_SITE_IDS = new Set([
  'production',
  'demo',
  'test',
  'sandbox',
  'dev',
  'platform',
  'admin',
  'www',
  'api',
  'stripe',
  'mail',
  'smtp',
  'support',
  'help',
  'status',
  'billing',
  'signup',
  'app'
]);

const CUSTOMER_HUB_ZONE_NAME = 'lovely-hub.com';
const DEFAULT_MARKETING_ORIGIN = 'https://lovely-home.co.uk';

/**
 * @param {Record<string, string | undefined>} env
 */
export function publicSignupConfigured(env) {
  const enabled = String(env.PUBLIC_SIGNUP_ENABLED ?? '').trim().toLowerCase();
  if (enabled !== '1' && enabled !== 'true' && enabled !== 'yes') {
    return false;
  }
  return stripeBillingConfigured(env) && githubAutomationConfigured(env);
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function marketingSiteOrigin(env) {
  const raw = env.MARKETING_SITE_ORIGIN?.trim() || DEFAULT_MARKETING_ORIGIN;
  return raw.replace(/\/$/, '');
}

/**
 * @param {string} siteId
 */
export function validatePublicSignupSiteId(siteId) {
  const billingError = validateBillingSiteId(siteId);
  if (billingError) return billingError;
  if (PUBLIC_SIGNUP_BLOCKED_SITE_IDS.has(siteId)) {
    return `Site id "${siteId}" is reserved. Choose another name for your hub.`;
  }
  return null;
}

/**
 * @param {object} manifest
 * @param {string} siteId
 */
export function isPublicSignupSlugAvailable(manifest, siteId) {
  const idError = validatePublicSignupSiteId(siteId);
  if (idError) {
    return { available: false, reason: idError };
  }
  if (getSiteFromManifest(manifest, siteId)) {
    return {
      available: false,
      reason: `Site id "${siteId}" is already taken. Try another name.`
    };
  }
  return { available: true, reason: null };
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export function publicSignupCorsHeaders(request, env) {
  const origin = marketingSiteOrigin(env);
  const requestOrigin = request.headers.get('Origin')?.trim() ?? '';
  const allowOrigin = requestOrigin === origin || requestOrigin.replace(/\/$/, '') === origin ? requestOrigin : origin;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin'
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} siteId
 */
export function publicSignupUrls(env, siteId) {
  const base = marketingSiteOrigin(env);
  const encodedSiteId = encodeURIComponent(siteId);
  return {
    successUrl: `${base}/signup-success.html?site=${encodedSiteId}`,
    cancelUrl: `${base}/signup.html?canceled=1&site=${encodedSiteId}`
  };
}

/**
 * Slug availability including reservations held by in-flight Checkout sessions.
 *
 * @param {object} manifest
 * @param {string} siteId
 * @param {D1Database | null | undefined} billingDb
 * @param {number} [nowMs]
 */
export async function checkPublicSignupSlug(manifest, siteId, billingDb, nowMs = Date.now()) {
  const base = isPublicSignupSlugAvailable(manifest, siteId);
  if (!base.available) return base;

  const reservation = await getActiveSignupReservation(billingDb, siteId, nowMs);
  if (reservation) {
    return {
      available: false,
      reason: `Site id "${siteId}" is being set up by someone else right now. Try another name.`
    };
  }
  return { available: true, reason: null };
}

/**
 * Start a trial: verify the request, hold the slug, and hand back a Stripe
 * Checkout URL. Nothing is provisioned here — the registry entry is created
 * from the Stripe webhook once payment details are confirmed, so an abandoned
 * or hostile signup cannot build infrastructure.
 *
 * @param {Record<string, string | undefined>} env
 * @param {{
 *   manifest: object;
 *   siteId: string;
 *   customerEmail: string;
 *   billingDb?: D1Database | null;
 *   billingInterval?: string;
 *   clientIp?: string;
 *   turnstileToken?: string;
 *   fetchImpl?: typeof fetch;
 *   nowMs?: number;
 * }} input
 */
export async function handlePublicHubSignup(env, input) {
  const {
    manifest,
    siteId,
    customerEmail,
    billingDb = null,
    billingInterval,
    clientIp = '',
    turnstileToken = '',
    fetchImpl,
    nowMs = Date.now()
  } = input;

  if (!publicSignupConfigured(env)) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'SIGNUP_DISABLED',
        message: 'Public signup is not enabled on this platform yet.'
      }
    };
  }

  const idError = validatePublicSignupSiteId(siteId);
  if (idError) {
    return {
      ok: false,
      status: 400,
      body: { error: 'INVALID_SITE_ID', message: idError }
    };
  }

  if (turnstileConfigured(env)) {
    const verdict = await verifyTurnstileToken(env, { token: turnstileToken, clientIp, fetchImpl });
    if (!verdict.ok) {
      return {
        ok: false,
        status: 403,
        body: {
          error: 'CHALLENGE_FAILED',
          message: 'We could not verify that request. Reload the page and try again.',
          codes: verdict.codes
        }
      };
    }
  }

  if (billingDb) {
    const clientKey = await hashSignupClientKey(clientIp);
    const throttle = await consumeSignupAttempt(billingDb, { clientKey, nowMs });
    if (!throttle.allowed) {
      return {
        ok: false,
        status: 429,
        retryAfterSec: throttle.retryAfterSec,
        body: {
          error: 'RATE_LIMITED',
          message: 'Too many signup attempts from this connection. Try again later.'
        }
      };
    }
    await pruneExpiredSignupData(billingDb, nowMs);
  }

  const slugCheck = await checkPublicSignupSlug(manifest, siteId, billingDb, nowMs);
  if (!slugCheck.available) {
    return {
      ok: false,
      status: 409,
      body: { error: 'SLUG_UNAVAILABLE', message: slugCheck.reason }
    };
  }

  if (billingDb) {
    const existingBilling = await getSiteBilling(billingDb, siteId);
    if (existingBilling && (existingBilling.status === 'trialing' || existingBilling.status === 'active')) {
      return {
        ok: false,
        status: 409,
        body: {
          error: 'BILLING_ALREADY_ACTIVE',
          message: `Site "${siteId}" already has an active subscription.`,
          billing: existingBilling
        }
      };
    }
  }

  const hostname = `${siteId}.${CUSTOMER_HUB_ZONE_NAME}`;
  const urls = publicSignupUrls(env, siteId);
  const checkout = await createBillingCheckoutSession(env, {
    siteId,
    customerEmail,
    successUrl: urls.successUrl,
    cancelUrl: urls.cancelUrl,
    billingInterval: billingInterval ?? 'month'
  });

  if (!checkout.ok) {
    return {
      ok: false,
      status: 503,
      body: {
        error: checkout.error ?? 'STRIPE_CHECKOUT_FAILED',
        message: checkout.message ?? 'Could not start Stripe Checkout.'
      }
    };
  }

  const reservation = await reserveSignupSlug(billingDb, {
    siteId,
    ownerEmail: customerEmail,
    sessionId: checkout.sessionId ?? null,
    nowMs
  });

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      siteId,
      hostname,
      trialDays: TRIAL_PERIOD_DAYS,
      checkoutUrl: checkout.url,
      sessionId: checkout.sessionId,
      reservedUntil: reservation.expiresAt ?? null
    }
  };
}
