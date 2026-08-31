import { maybeDispatchBillingProvision } from './platformBillingProvision.js';
import { maybeDispatchBillingDeprovision } from './platformBillingDeprovision.js';
import { maybeDispatchSignupRegistry } from './platformBillingRegistry.js';
import { releaseSignupReservation } from './platformSignupGuards.js';
import { getSiteFromManifest } from './platformApi.js';
import { resetBillingCycleFlags, shouldResetBillingCycleFlags } from './platformBillingLifecycle.js';
import { maybeSendCustomerLifecycleEmail } from './platformCustomerEmail.js';

/** @typedef {'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'} BillingStatus */

/** @typedef {{
 *   site_id: string;
 *   stripe_customer_id: string;
 *   stripe_subscription_id: string | null;
 *   status: BillingStatus;
 *   trial_end: number | null;
 *   archive_r2_key: string | null;
 *   owner_email: string | null;
 *   provision_dispatched_at: number | null;
 *   provision_last_error: string | null;
 *   deprovision_dispatched_at: number | null;
 *   deprovision_last_error: string | null;
 *   signup_email_sent_at: number | null;
 *   trial_ending_email_sent_at: number | null;
 *   past_due_email_sent_at: number | null;
 *   canceled_email_sent_at: number | null;
 *   created_at: number;
 *   updated_at: number;
 * }} SiteBillingRow */

/** Card-required trial length sent to Stripe Checkout (`subscription_data.trial_period_days`). */
export const TRIAL_PERIOD_DAYS = 7;

const SITE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;

/**
 * @param {string} siteId
 */
export function validateBillingSiteId(siteId) {
  const id = String(siteId ?? '').trim();
  if (!id) return 'Site id is required.';
  if (!SITE_ID_RE.test(id)) {
    return 'Site id must start with a letter and use lowercase letters, numbers, hyphens, or underscores (max 32 chars).';
  }
  return null;
}

/** @type {readonly BillingStatus[]} */
export const BILLING_STATUSES = ['trialing', 'active', 'past_due', 'canceled', 'incomplete'];

/**
 * @param {Record<string, string | undefined>} env
 */
export function stripeBillingConfigured(env) {
  return Boolean(
    env.STRIPE_SECRET_KEY?.trim() &&
      env.STRIPE_WEBHOOK_SECRET?.trim() &&
      (env.STRIPE_PRICE_ID?.trim() || env.STRIPE_PRICE_ID_YEARLY?.trim())
  );
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'month' | 'year' | string | undefined | null} billingInterval
 */
export function resolveStripePriceId(env, billingInterval) {
  const interval = String(billingInterval ?? 'month')
    .trim()
    .toLowerCase();
  if (interval === 'year' || interval === 'yearly' || interval === 'annual') {
    return env.STRIPE_PRICE_ID_YEARLY?.trim() || null;
  }
  return env.STRIPE_PRICE_ID?.trim() || null;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function platformBillingDbConfigured(env) {
  const db = env.PLATFORM_BILLING_DB;
  return Boolean(db && typeof db === 'object' && 'prepare' in db && typeof db.prepare === 'function');
}

/**
 * @param {Record<string, unknown>} env
 * @returns {D1Database | null}
 */
export function getPlatformBillingDb(env) {
  const db = env.PLATFORM_BILLING_DB;
  if (!db || typeof db !== 'object' || !('prepare' in db) || typeof db.prepare !== 'function') {
    return null;
  }
  return /** @type {D1Database} */ (db);
}

/**
 * @param {string | undefined | null} stripeStatus
 * @returns {BillingStatus}
 */
export function mapStripeSubscriptionStatus(stripeStatus) {
  switch (String(stripeStatus ?? '').toLowerCase()) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    default:
      return 'incomplete';
  }
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function stripeTimestampToMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * 1000;
}

/**
 * @param {Record<string, unknown>} object
 * @param {string} prefix
 * @returns {[string, string][]}
 */
export function encodeStripeFormEntries(object, prefix = '') {
  /** @type {[string, string][]} */
  const entries = [];
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          entries.push(...encodeStripeFormEntries(/** @type {Record<string, unknown>} */ (item), `${fullKey}[${index}]`));
        } else if (item !== undefined && item !== null) {
          entries.push([`${fullKey}[${index}]`, String(item)]);
        }
      });
      continue;
    }
    if (typeof value === 'object') {
      entries.push(...encodeStripeFormEntries(/** @type {Record<string, unknown>} */ (value), fullKey));
      continue;
    }
    entries.push([fullKey, String(value)]);
  }
  return entries;
}

/**
 * @param {string} secretKey
 * @param {string} method
 * @param {string} path
 * @param {Record<string, unknown>} [params]
 */
export async function stripeApiRequest(secretKey, method, path, params = {}) {
  const entries = encodeStripeFormEntries(params);
  const body = new URLSearchParams(entries).toString();
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: method === 'GET' ? undefined : body
  });
  const payload = await response.json();
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(/** @type {{ error?: { message?: string } }} */ (payload).error?.message ?? response.status)
        : `Stripe API ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} platformHostname
 */
export function defaultCheckoutUrls(env, platformHostname) {
  const base = platformHostname.startsWith('http')
    ? platformHostname.replace(/\/$/, '')
    : `https://${platformHostname.replace(/\/$/, '')}`;
  return {
    successUrl: env.STRIPE_CHECKOUT_SUCCESS_URL?.trim() || `${base}/?billing=success`,
    cancelUrl: env.STRIPE_CHECKOUT_CANCEL_URL?.trim() || `${base}/?billing=cancel`
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{
 *   siteId: string;
 *   customerEmail: string;
 *   successUrl: string;
 *   cancelUrl: string;
 *   billingInterval?: string;
 *   priceId?: string;
 * }} input
 */
export async function createBillingCheckoutSession(env, input) {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  const billingInterval = input.billingInterval ?? 'month';
  const priceId = input.priceId?.trim() || resolveStripePriceId(env, billingInterval);
  if (!secretKey) {
    return { ok: false, error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe billing is not configured.' };
  }
  if (!priceId) {
    const yearly = ['year', 'yearly', 'annual'].includes(String(billingInterval).trim().toLowerCase());
    return {
      ok: false,
      error: 'STRIPE_PRICE_NOT_CONFIGURED',
      message: yearly
        ? 'Yearly billing is not configured yet. Choose monthly or contact support.'
        : 'Stripe billing is not configured.'
    };
  }

  const siteId = input.siteId.trim();
  const customerEmail = input.customerEmail.trim().toLowerCase();
  if (!siteId || !customerEmail) {
    return { ok: false, error: 'INVALID_INPUT', message: 'siteId and customerEmail are required.' };
  }

  const session = await stripeApiRequest(secretKey, 'POST', '/checkout/sessions', {
    mode: 'subscription',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: customerEmail,
    payment_method_collection: 'always',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_PERIOD_DAYS,
      metadata: { site_id: siteId }
    },
    metadata: { site_id: siteId }
  });

  return {
    ok: true,
    sessionId: String(session.id ?? ''),
    url: String(session.url ?? '')
  };
}

/**
 * @param {D1Database} db
 * @param {Partial<SiteBillingRow> & { site_id: string; stripe_customer_id: string; status: BillingStatus }} record
 */
export async function upsertSiteBilling(db, record) {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO site_billing (
        site_id, stripe_customer_id, stripe_subscription_id, status,
        trial_end, archive_r2_key, owner_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(site_id) DO UPDATE SET
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, site_billing.stripe_subscription_id),
        status = excluded.status,
        trial_end = COALESCE(excluded.trial_end, site_billing.trial_end),
        archive_r2_key = COALESCE(excluded.archive_r2_key, site_billing.archive_r2_key),
        owner_email = COALESCE(excluded.owner_email, site_billing.owner_email),
        updated_at = excluded.updated_at`
    )
    .bind(
      record.site_id,
      record.stripe_customer_id,
      record.stripe_subscription_id ?? null,
      record.status,
      record.trial_end ?? null,
      record.archive_r2_key ?? null,
      record.owner_email ?? null,
      record.created_at ?? now,
      now
    )
    .run();
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 * @returns {Promise<SiteBillingRow | null>}
 */
export async function getSiteBilling(db, siteId) {
  const row = await db
    .prepare('SELECT * FROM site_billing WHERE site_id = ? LIMIT 1')
    .bind(siteId)
    .first();
  return row ? /** @type {SiteBillingRow} */ (row) : null;
}

/**
 * @param {D1Database} db
 * @param {string} subscriptionId
 * @returns {Promise<SiteBillingRow | null>}
 */
export async function getSiteBillingBySubscriptionId(db, subscriptionId) {
  const id = String(subscriptionId ?? '').trim();
  if (!id) return null;
  const row = await db
    .prepare('SELECT * FROM site_billing WHERE stripe_subscription_id = ? LIMIT 1')
    .bind(id)
    .first();
  return row ? /** @type {SiteBillingRow} */ (row) : null;
}

/**
 * @param {D1Database} db
 * @returns {Promise<SiteBillingRow[]>}
 */
export async function listSiteBilling(db) {
  const result = await db
    .prepare('SELECT * FROM site_billing ORDER BY updated_at DESC')
    .all();
  return /** @type {SiteBillingRow[]} */ (result.results ?? []);
}

/**
 * @param {D1Database} db
 * @param {string} eventId
 * @param {string} eventType
 */
export async function markWebhookEventProcessed(db, eventId, eventType) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO stripe_webhook_events (event_id, event_type, processed_at)
       VALUES (?, ?, ?)`
    )
    .bind(eventId, eventType, Date.now())
    .run();
}

/**
 * @param {D1Database} db
 * @param {string} eventId
 */
export async function isWebhookEventProcessed(db, eventId) {
  const row = await db
    .prepare('SELECT event_id FROM stripe_webhook_events WHERE event_id = ? LIMIT 1')
    .bind(eventId)
    .first();
  return Boolean(row);
}

/**
 * @param {unknown} subscription
 * @returns {{ siteId: string | null, customerId: string | null, subscriptionId: string | null, status: BillingStatus, trialEnd: number | null }}
 */
export function parseStripeSubscription(subscription) {
  const sub = /** @type {Record<string, unknown>} */ (subscription ?? {});
  const metadata = /** @type {Record<string, unknown>} */ (sub.metadata ?? {});
  return {
    siteId: metadata.site_id ? String(metadata.site_id) : null,
    customerId: sub.customer ? String(sub.customer) : null,
    subscriptionId: sub.id ? String(sub.id) : null,
    status: mapStripeSubscriptionStatus(String(sub.status ?? '')),
    trialEnd: stripeTimestampToMs(sub.trial_end)
  };
}

/**
 * @param {D1Database} db
 * @param {Record<string, unknown>} event
 * @param {{
 *   env?: Record<string, string | undefined>;
 *   manifest?: object;
 *   fetchImpl?: typeof fetch;
 * }} [context]
 * @returns {Promise<{ ok: true, action: string, provision?: Record<string, unknown> } | { ok: false, error: string, message?: string }>}
 */
export async function handleStripeBillingEvent(db, event, context = {}) {
  const eventId = String(event.id ?? '');
  const eventType = String(event.type ?? '');
  if (!eventId || !eventType) {
    return { ok: false, error: 'INVALID_EVENT', message: 'Missing Stripe event id or type.' };
  }

  if (await isWebhookEventProcessed(db, eventId)) {
    return { ok: true, action: 'duplicate_ignored' };
  }

  const object = /** @type {Record<string, unknown>} */ (
    /** @type {{ data?: { object?: unknown } }} */ (event).data?.object ?? {}
  );

  /** @type {{ siteId: string | null; customerId: string | null; subscriptionId: string | null; status: BillingStatus; trialEnd: number | null; ownerEmail?: string | null }} */
  let billingPatch = {
    siteId: null,
    customerId: null,
    subscriptionId: null,
    status: /** @type {BillingStatus} */ ('incomplete'),
    trialEnd: null,
    ownerEmail: null
  };

  if (eventType === 'checkout.session.completed') {
    const metadata = /** @type {Record<string, unknown>} */ (object.metadata ?? {});
    billingPatch.siteId = metadata.site_id ? String(metadata.site_id) : null;
    billingPatch.customerId = object.customer ? String(object.customer) : null;
    billingPatch.subscriptionId = object.subscription ? String(object.subscription) : null;
    billingPatch.status = 'trialing';
    billingPatch.ownerEmail = object.customer_details
      ? String(/** @type {{ email?: string }} */ (object.customer_details).email ?? '') || null
      : object.customer_email
        ? String(object.customer_email)
        : null;
  } else if (eventType === 'customer.subscription.trial_will_end') {
    const parsed = parseStripeSubscription(object);
    let existingForTrial = parsed.siteId ? await getSiteBilling(db, parsed.siteId) : null;
    if (!existingForTrial && parsed.subscriptionId) {
      existingForTrial = await getSiteBillingBySubscriptionId(db, parsed.subscriptionId);
    }
    billingPatch.siteId = parsed.siteId || existingForTrial?.site_id || null;
    billingPatch.customerId = parsed.customerId || existingForTrial?.stripe_customer_id || null;
    billingPatch.subscriptionId = parsed.subscriptionId || existingForTrial?.stripe_subscription_id || null;
    billingPatch.status = existingForTrial?.status || parsed.status || /** @type {BillingStatus} */ ('trialing');
    billingPatch.trialEnd = parsed.trialEnd || existingForTrial?.trial_end || null;
    billingPatch.ownerEmail = existingForTrial?.owner_email || null;
    if (!billingPatch.siteId || !billingPatch.customerId) {
      await markWebhookEventProcessed(db, eventId, eventType);
      return { ok: true, action: 'trial_will_end_logged' };
    }
  } else if (eventType.startsWith('customer.subscription.')) {
    billingPatch = parseStripeSubscription(object);
  } else if (eventType === 'invoice.payment_failed') {
    const lineMetadata =
      Array.isArray(object.lines?.data) && object.lines.data[0]?.metadata
        ? object.lines.data[0].metadata
        : {};
    const metadata = /** @type {Record<string, unknown>} */ ({
      ...(object.metadata ?? {}),
      ...lineMetadata
    });
    billingPatch.siteId = metadata.site_id ? String(metadata.site_id) : null;
    billingPatch.customerId = object.customer ? String(object.customer) : null;
    billingPatch.subscriptionId = object.subscription ? String(object.subscription) : null;
    billingPatch.status = 'past_due';
  } else {
    await markWebhookEventProcessed(db, eventId, eventType);
    return { ok: true, action: 'ignored_unhandled_type' };
  }

  if (!billingPatch.siteId || !billingPatch.customerId) {
    await markWebhookEventProcessed(db, eventId, eventType);
    return {
      ok: false,
      error: 'MISSING_SITE_OR_CUSTOMER',
      message: `Could not resolve site_id/customer for ${eventType}.`
    };
  }

  const existingBilling = await getSiteBilling(db, billingPatch.siteId);

  const manifest = context.manifest;
  const manifestSite = manifest ? getSiteFromManifest(manifest, billingPatch.siteId) : null;
  const cycleReset = shouldResetBillingCycleFlags({
    status: billingPatch.status,
    subscriptionId: billingPatch.subscriptionId,
    existingBilling,
    manifestSite
  });
  if (cycleReset.reset) {
    await resetBillingCycleFlags(db, billingPatch.siteId, cycleReset);
  }

  /** @type {SiteBillingRow | null} */
  let billingForDispatch = existingBilling;
  if (cycleReset.reset && existingBilling) {
    billingForDispatch = {
      ...existingBilling,
      ...(cycleReset.clearDeprovision
        ? { deprovision_dispatched_at: null, deprovision_last_error: null }
        : {}),
      ...(cycleReset.clearProvision
        ? { provision_dispatched_at: null, provision_last_error: null }
        : {})
    };
  }

  await upsertSiteBilling(db, {
    site_id: billingPatch.siteId,
    stripe_customer_id: billingPatch.customerId,
    stripe_subscription_id: billingPatch.subscriptionId,
    status: billingPatch.status,
    trial_end: billingPatch.trialEnd,
    owner_email: billingPatch.ownerEmail ?? existingBilling?.owner_email ?? null
  });

  /** @type {Record<string, unknown> | undefined} */
  let registry;
  /** @type {Record<string, unknown> | undefined} */
  let provision;
  /** @type {Record<string, unknown> | undefined} */
  let deprovision;
  const env = context.env;
  if (env && manifest) {
    const registryResult = await maybeDispatchSignupRegistry(env, db, manifest, {
      siteId: billingPatch.siteId,
      eventType,
      status: billingPatch.status,
      existingBilling: billingForDispatch
    });
    registry = registryResult;
    if (!registryResult.ok) {
      return {
        ok: false,
        error: registryResult.error ?? 'REGISTRY_DISPATCH_FAILED',
        message: registryResult.message
      };
    }
    if (registryResult.action === 'registry_dispatched') {
      await releaseSignupReservation(db, billingPatch.siteId);
    }

    const provisionResult = await maybeDispatchBillingProvision(env, db, manifest, {
      siteId: billingPatch.siteId,
      eventType,
      status: billingPatch.status,
      existingBilling: billingForDispatch
    });
    provision = provisionResult;
    if (!provisionResult.ok) {
      return {
        ok: false,
        error: provisionResult.error ?? 'PROVISION_DISPATCH_FAILED',
        message: provisionResult.message
      };
    }

    const deprovisionResult = await maybeDispatchBillingDeprovision(env, db, manifest, {
      siteId: billingPatch.siteId,
      eventType,
      status: billingPatch.status,
      existingBilling: billingForDispatch
    });
    deprovision = deprovisionResult;
    if (!deprovisionResult.ok) {
      return {
        ok: false,
        error: deprovisionResult.error ?? 'DEPROVISION_DISPATCH_FAILED',
        message: deprovisionResult.message
      };
    }
  }

  /** @type {Record<string, unknown> | undefined} */
  let email;
  if (env) {
    const billingAfter = await getSiteBilling(db, billingPatch.siteId);
    const emailResult = await maybeSendCustomerLifecycleEmail(
      env,
      db,
      {
        eventType,
        status: billingPatch.status,
        siteId: billingPatch.siteId,
        ownerEmail: billingPatch.ownerEmail ?? billingAfter?.owner_email ?? null,
        trialEnd: billingPatch.trialEnd ?? billingAfter?.trial_end ?? null,
        existingBilling: billingAfter
      },
      context.fetchImpl
    );
    email = emailResult;
    if (!emailResult.ok) {
      return {
        ok: false,
        error: emailResult.error ?? 'EMAIL_SEND_FAILED',
        message: emailResult.message
      };
    }
  }

  await markWebhookEventProcessed(db, eventId, eventType);
  return {
    ok: true,
    action: `updated_${billingPatch.status}`,
    ...(registry ? { registry } : {}),
    ...(provision ? { provision } : {}),
    ...(deprovision ? { deprovision } : {}),
    ...(email ? { email } : {})
  };
}

/**
 * @param {string} payload
 * @param {string | null} signatureHeader
 * @param {string} secret
 * @param {number} [toleranceSec]
 */
export async function verifyStripeWebhookSignature(
  payload,
  signatureHeader,
  secret,
  toleranceSec = 300
) {
  if (!signatureHeader?.trim() || !secret.trim()) {
    return { ok: false, error: 'MISSING_SIGNATURE_OR_SECRET' };
  }

  /** @type {Record<string, string>} */
  const parts = {};
  for (const segment of signatureHeader.split(',')) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    parts[segment.slice(0, eq).trim()] = segment.slice(eq + 1);
  }

  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!Number.isFinite(timestamp) || !signature) {
    return { ok: false, error: 'INVALID_SIGNATURE_HEADER' };
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > toleranceSec) {
    return { ok: false, error: 'TIMESTAMP_OUT_OF_TOLERANCE' };
  }

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(mac)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  if (!timingSafeEqualHex(expected, signature)) {
    return { ok: false, error: 'SIGNATURE_MISMATCH' };
  }

  return { ok: true };
}

/**
 * @param {string} left
 * @param {string} right
 */
export function timingSafeEqualHex(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function readVerifiedStripeEvent(request, env) {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return { ok: false, response: Response.json({ error: 'STRIPE_NOT_CONFIGURED' }, { status: 503 }) };
  }

  const payload = await request.text();
  const signature = request.headers.get('Stripe-Signature');
  const verified = await verifyStripeWebhookSignature(payload, signature, webhookSecret);
  if (!verified.ok) {
    return {
      ok: false,
      response: Response.json({ error: verified.error }, { status: 400 })
    };
  }

  try {
    const event = JSON.parse(payload);
    return { ok: true, event };
  } catch {
    return { ok: false, response: Response.json({ error: 'INVALID_JSON' }, { status: 400 }) };
  }
}
