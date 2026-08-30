import {
  createBillingCheckoutSession,
  getSiteBilling,
  stripeBillingConfigured,
  TRIAL_PERIOD_DAYS,
  validateBillingSiteId
} from './platformBilling.js';
import { buildSiteManagePayload } from './platformSiteMutations.js';
import { dispatchSiteManageWorkflow, githubAutomationConfigured } from './platformGitHub.js';
import { getSiteFromManifest } from './platformApi.js';

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
 * @param {Record<string, string | undefined>} env
 * @param {object} manifest
 * @param {string} siteId
 * @param {string} customerEmail
 * @param {D1Database | null | undefined} billingDb
 * @param {string | undefined} billingInterval
 */
export async function handlePublicHubSignup(env, manifest, siteId, customerEmail, billingDb, billingInterval) {
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

  const slugCheck = isPublicSignupSlugAvailable(manifest, siteId);
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
  const built = buildSiteManagePayload(manifest, 'create', siteId, {
    hostname,
    zone_name: CUSTOMER_HUB_ZONE_NAME,
    hub_environment: siteId,
    vanilla: false,
    terraform: true,
    attach_hub_api_binding: true,
    owner_emails: [customerEmail]
  });

  if (!built.ok) {
    return {
      ok: false,
      status: 400,
      body: { error: built.error ?? 'VALIDATION_ERROR', message: built.message ?? 'Invalid signup.' }
    };
  }

  const registry = await dispatchSiteManageWorkflow(env, 'create', built.payload);
  if (!registry.ok) {
    return {
      ok: false,
      status: 503,
      body: {
        error: registry.error ?? 'REGISTRY_DISPATCH_FAILED',
        message: registry.message ?? 'Could not start hub registration.'
      }
    };
  }

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

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      siteId,
      hostname,
      trialDays: TRIAL_PERIOD_DAYS,
      registry,
      checkoutUrl: checkout.url,
      sessionId: checkout.sessionId
    }
  };
}
