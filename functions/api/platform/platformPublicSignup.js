import { getStripeMode } from './platformStripeMode.js';
import {
  createBillingCheckoutSession,
  createFreeBillingSubscription,
  getSiteBilling,
  stripeBillingConfigured,
  stripeFreePriceConfigured,
  TRIAL_PERIOD_DAYS,
  upsertSiteBilling,
  validateBillingSiteId
} from './platformBilling.js';
import { maybeDispatchSignupRegistry } from './platformBillingRegistry.js';
import { githubAutomationConfigured } from './platformGitHub.js';
import { getSiteFromManifest } from './platformApi.js';
import {
  consumeSignupAttempt,
  getActiveSignupReservation,
  hashSignupClientKey,
  pruneExpiredSignupData,
  releaseSignupReservation,
  reserveSignupSlug
} from './platformSignupGuards.js';
import {
  hubNameHeldReason,
  isHubNameHeld,
  isHubReclaimSignup,
  ownerEmailMatchesBilling
} from './platformHubNameHold.js';
import { turnstileConfigured, verifyTurnstileToken } from './platformSignupTurnstile.js';
import {
  releaseReferralReservationForSite,
  reserveReferralCodeForCheckout,
  validateReferralForSignup
} from './platformReferrals.js';
import { resolveIntroOfferForSignup } from './platformIntroOffer.js';

/** Reserved slugs — internal hubs and common DNS names. */
export const PUBLIC_SIGNUP_BLOCKED_SITE_IDS = new Set([
  'production',
  'demo',
  'test',
  'sandbox',
  'dev',
  'lovely',
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
  'app',
  'e2e'
]);

const CUSTOMER_HUB_ZONE_NAME = 'lovely-hub.com';
const DEFAULT_MARKETING_ORIGIN = 'https://lovely-home.co.uk';

/**
 * @param {unknown} plan
 * @param {unknown} [billingInterval]
 * @returns {'free' | 'plus'}
 */
export function normalizeSignupPlan(plan, billingInterval) {
  const normalized = String(plan ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'free') return 'free';
  if (normalized === 'plus') return 'plus';
  const interval = String(billingInterval ?? '')
    .trim()
    .toLowerCase();
  if (interval === 'free') return 'free';
  return 'plus';
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'test' | 'live'} [mode]
 */
export function publicSignupConfigured(env, mode = 'test') {
  const enabled = String(env.PUBLIC_SIGNUP_ENABLED ?? '').trim().toLowerCase();
  if (enabled !== '1' && enabled !== 'true' && enabled !== 'yes') {
    return false;
  }
  return stripeBillingConfigured(env, mode) && githubAutomationConfigured(env);
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
export function publicSignupUrls(env, siteId, options = {}) {
  const base = marketingSiteOrigin(env);
  const encodedSiteId = encodeURIComponent(siteId);
  const returningQuery = options.returning ? '&returning=1' : '';
  return {
    successUrl: `${base}/signup-success?site=${encodedSiteId}${returningQuery}`,
    cancelUrl: `${base}/signup?canceled=1&site=${encodedSiteId}`
  };
}

/**
 * Slug availability including reservations held by in-flight Checkout sessions.
 *
 * @param {object} manifest
 * @param {string} siteId
 * @param {D1Database | null | undefined} billingDb
 * @param {{ nowMs?: number, ownerEmail?: string, skipHold?: boolean }} [options]
 */
export async function checkPublicSignupSlug(manifest, siteId, billingDb, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const base = isPublicSignupSlugAvailable(manifest, siteId);
  if (!base.available) return base;

  const reservation = await getActiveSignupReservation(billingDb, siteId, nowMs);
  if (reservation) {
    return {
      available: false,
      reason: `Site id "${siteId}" is being set up by someone else right now. Try another name.`
    };
  }

  if (billingDb && !options.skipHold) {
    const billing = await getSiteBilling(billingDb, siteId);
    if (isHubNameHeld(billing, nowMs)) {
      if (ownerEmailMatchesBilling(options.ownerEmail, billing?.owner_email)) {
        return { available: true, reason: null };
      }
      return {
        available: false,
        reason: hubNameHeldReason(siteId, /** @type {number} */ (billing?.slug_held_until))
      };
    }
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
 *   plan?: string;
 *   billingInterval?: string;
 *   referralCode?: string;
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
    plan: inputPlan,
    billingInterval,
    referralCode: inputReferralCode = '',
    clientIp = '',
    turnstileToken = '',
    fetchImpl,
    nowMs = Date.now()
  } = input;

  const signupPlan = normalizeSignupPlan(inputPlan, billingInterval);
  const plusBillingInterval =
    String(billingInterval ?? 'month')
      .trim()
      .toLowerCase() === 'year'
      ? 'year'
      : 'month';

  const stripeMode = await getStripeMode(billingDb);
  if (!publicSignupConfigured(env, stripeMode)) {
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

  const isLifecycleSlug = /^e2e-[a-z0-9-]+$/.test(siteId);
  if (isLifecycleSlug && stripeMode === 'live') {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'E2E_NOT_ALLOWED',
        message: 'Lifecycle test hubs can only be created while Stripe is in test mode.'
      }
    };
  }

  if (turnstileConfigured(env) && !isLifecycleSlug) {
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

  const slugCheck = await checkPublicSignupSlug(manifest, siteId, billingDb, {
    nowMs,
    ownerEmail: customerEmail
  });
  if (!slugCheck.available) {
    return {
      ok: false,
      status: 409,
      body: { error: 'SLUG_UNAVAILABLE', message: slugCheck.reason }
    };
  }

  let existingBilling = null;
  if (billingDb) {
    existingBilling = await getSiteBilling(billingDb, siteId);
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
  const returning = isHubReclaimSignup(existingBilling, manifest, siteId, customerEmail);
  const urls = publicSignupUrls(env, siteId, { returning });
  const hold = await reserveSignupSlug(billingDb, {
    siteId,
    ownerEmail: customerEmail,
    sessionId: null,
    nowMs
  });
  if (!hold.reserved) {
    return {
      ok: false,
      status: 409,
      body: {
        error: 'SLUG_UNAVAILABLE',
        message: `Site id "${siteId}" is being set up by someone else right now. Try another name.`
      }
    };
  }

  if (signupPlan === 'free' && inputReferralCode.trim()) {
    await releaseSignupReservation(billingDb, siteId);
    return {
      ok: false,
      status: 400,
      body: {
        error: 'REFERRAL_REQUIRES_PLUS',
        message: 'Referral discounts apply to Lovely Home+ only. Choose monthly or yearly to continue.'
      }
    };
  }

  const referralValidation = await validateReferralForSignup(billingDb, {
    code: inputReferralCode,
    refereeSiteId: siteId,
    refereeEmail: customerEmail,
    billingInterval: plusBillingInterval,
    nowMs
  });
  if (!referralValidation.ok) {
    await releaseSignupReservation(billingDb, siteId);
    return {
      ok: false,
      status: 400,
      body: {
        error: referralValidation.error ?? 'INVALID_REFERRAL',
        message: referralValidation.message ?? 'That referral link is not valid.'
      }
    };
  }

  if (signupPlan === 'free') {
    if (!billingDb) {
      await releaseSignupReservation(billingDb, siteId);
      return {
        ok: false,
        status: 503,
        body: {
          error: 'BILLING_DB_NOT_CONFIGURED',
          message: 'Signup is temporarily unavailable. Try again later or email support.'
        }
      };
    }
    if (!stripeFreePriceConfigured(env, stripeMode)) {
      await releaseSignupReservation(billingDb, siteId);
      return {
        ok: false,
        status: 503,
        body: {
          error: 'STRIPE_FREE_PRICE_NOT_CONFIGURED',
          message: 'Free signup is not configured yet. Contact support.'
        }
      };
    }

    let freeSubscription;
    try {
      freeSubscription = await createFreeBillingSubscription(env, {
        siteId,
        customerEmail,
        mode: stripeMode
      });
    } catch (error) {
      await releaseSignupReservation(billingDb, siteId);
      return {
        ok: false,
        status: 503,
        body: {
          error: 'STRIPE_FREE_SUBSCRIPTION_FAILED',
          message: error instanceof Error ? error.message : 'Could not start your free home.'
        }
      };
    }

    if (!freeSubscription.ok) {
      await releaseSignupReservation(billingDb, siteId);
      return {
        ok: false,
        status: 503,
        body: {
          error: freeSubscription.error ?? 'STRIPE_FREE_SUBSCRIPTION_FAILED',
          message: freeSubscription.message ?? 'Could not start your free home.'
        }
      };
    }

    await upsertSiteBilling(billingDb, {
      site_id: siteId,
      stripe_customer_id: freeSubscription.customerId,
      stripe_subscription_id: freeSubscription.subscriptionId,
      status: freeSubscription.status,
      trial_end: freeSubscription.trialEnd,
      owner_email: customerEmail
    });

    const registryResult = await maybeDispatchSignupRegistry(env, billingDb, manifest, {
      siteId,
      eventType: 'customer.subscription.created',
      status: freeSubscription.status,
      existingBilling: existingBilling
    });

    if (!registryResult.ok) {
      await releaseSignupReservation(billingDb, siteId);
      return {
        ok: false,
        status: 503,
        body: {
          error: registryResult.error ?? 'REGISTRY_DISPATCH_FAILED',
          message: registryResult.message ?? 'Your home was created in billing but setup could not start.'
        }
      };
    }

    const reservation = await reserveSignupSlug(billingDb, {
      siteId,
      ownerEmail: customerEmail,
      sessionId: freeSubscription.subscriptionId ?? null,
      nowMs
    });
    await releaseSignupReservation(billingDb, siteId);

    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        siteId,
        hostname,
        plan: 'free',
        successUrl: urls.successUrl,
        subscriptionId: freeSubscription.subscriptionId,
        reservedUntil: reservation.expiresAt ?? null
      }
    };
  }

  const introOffer = await resolveIntroOfferForSignup(env, billingDb, {
    customerEmail,
    billingInterval: plusBillingInterval,
    referralCode: inputReferralCode
  });

  const checkout = await createBillingCheckoutSession(env, {
    siteId,
    customerEmail,
    successUrl: urls.successUrl,
    cancelUrl: urls.cancelUrl,
    billingInterval: plusBillingInterval,
    mode: stripeMode,
    referralCode: referralValidation.referral?.code,
    referrerSiteId: referralValidation.referral?.referrerSiteId,
    applyIntroOffer: introOffer.apply
  });

  if (!checkout.ok) {
    await releaseSignupReservation(billingDb, siteId);
    await releaseReferralReservationForSite(billingDb, siteId);
    return {
      ok: false,
      status: 503,
      body: {
        error: checkout.error ?? 'STRIPE_CHECKOUT_FAILED',
        message: checkout.message ?? 'Could not start Stripe Checkout.'
      }
    };
  }

  if (referralValidation.referral?.code && checkout.sessionId) {
    const reserved = await reserveReferralCodeForCheckout(billingDb, {
      code: referralValidation.referral.code,
      refereeSiteId: siteId,
      refereeEmail: customerEmail,
      stripeSessionId: checkout.sessionId,
      nowMs
    });
    if (!reserved.reserved) {
      await releaseSignupReservation(billingDb, siteId);
      return {
        ok: false,
        status: 409,
        body: {
          error: 'REFERRAL_UNAVAILABLE',
          message: 'That referral link was just used. Ask your friend for a new link.'
        }
      };
    }
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
      plan: 'plus',
      trialDays: TRIAL_PERIOD_DAYS,
      checkoutUrl: checkout.url,
      sessionId: checkout.sessionId,
      reservedUntil: reservation.expiresAt ?? null,
      referral: referralValidation.referral
        ? {
            code: referralValidation.referral.code,
            billingInterval: referralValidation.referral.billingInterval
          }
        : null,
      introOffer: introOffer.apply
        ? {
            billingInterval: introOffer.interval,
            benefit: introOffer.benefit
          }
        : null
    }
  };
}
