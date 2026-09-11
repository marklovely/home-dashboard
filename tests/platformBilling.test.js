import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  cancelPriorSubscriptionAfterUpgrade,
  checkoutSessionOwnerEmail,
  createFreeSubscriptionOnCustomer,
  createUpgradeCheckoutSession,
  customerHasActiveSiteSubscription,
  closeFreeHubSubscription,
  downgradePlusToFreeSubscription,
  encodeStripeFormEntries,
  handleStripeBillingEvent,
  mapStripeSubscriptionStatus,
  resolveBillingOwnerEmail,
  resolveStripeFreePriceId,
  stripeTimestampToMs,
  timingSafeEqualHex,
  validateBillingSiteId,
  verifyStripeWebhookSignature
} from '../functions/api/platform/platformBilling.js';

describe('platform billing helpers', () => {
  it('maps Stripe subscription statuses', () => {
    expect(mapStripeSubscriptionStatus('trialing')).toBe('trialing');
    expect(mapStripeSubscriptionStatus('active')).toBe('active');
    expect(mapStripeSubscriptionStatus('past_due')).toBe('past_due');
    expect(mapStripeSubscriptionStatus('canceled')).toBe('canceled');
    expect(mapStripeSubscriptionStatus('unpaid')).toBe('canceled');
    expect(mapStripeSubscriptionStatus('incomplete')).toBe('incomplete');
  });

  it('validates billing site ids', () => {
    expect(validateBillingSiteId('smith')).toBeNull();
    expect(validateBillingSiteId('kitchen-home')).toBeNull();
    expect(validateBillingSiteId('kitchen_home')).toMatch(/hyphens/i);
    expect(validateBillingSiteId('')).toBeTruthy();
    expect(validateBillingSiteId('Bad')).toBeTruthy();
  });

  it('resolves the free Stripe price id from env', () => {
    const env = {
      STRIPE_PRICE_ID_FREE: 'price_free_test',
      STRIPE_PRICE_ID_FREE_LIVE: 'price_free_live'
    };
    expect(resolveStripeFreePriceId(env, 'test')).toBe('price_free_test');
    expect(resolveStripeFreePriceId(env, 'live')).toBe('price_free_live');
  });

  it('reads checkout owner email from customer_details or customer_email', () => {
    expect(
      checkoutSessionOwnerEmail({
        customer_details: { email: 'Owner@Example.com' }
      })
    ).toBe('owner@example.com');
    expect(
      checkoutSessionOwnerEmail({
        customer_email: 'practice@example.com'
      })
    ).toBe('practice@example.com');
    expect(checkoutSessionOwnerEmail({ customer: 'cus_123' })).toBeNull();
  });

  it('encodes nested Stripe form params', () => {
    const entries = encodeStripeFormEntries({
      mode: 'subscription',
      line_items: [{ price: 'price_123', quantity: 1 }],
      subscription_data: { metadata: { site_id: 'smith' } }
    });
    const params = Object.fromEntries(entries);
    expect(params.mode).toBe('subscription');
    expect(params['line_items[0][price]']).toBe('price_123');
    expect(params['subscription_data[metadata][site_id]']).toBe('smith');
    expect(params['subscription_data[trial_period_days]']).toBeUndefined();
  });

  it('converts Stripe unix timestamps to ms', () => {
    expect(stripeTimestampToMs(1_700_000_000)).toBe(1_700_000_000_000);
    expect(stripeTimestampToMs(null)).toBeNull();
  });

  it('compares hex digests in constant time', () => {
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true);
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false);
    expect(timingSafeEqualHex('abcd', 'abc')).toBe(false);
  });

  it('creates upgrade checkout with prior subscription metadata', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'cs_upgrade', url: 'https://checkout.stripe.com/upgrade' })
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createUpgradeCheckoutSession(
      {
        STRIPE_SECRET_KEY: 'sk_test',
        STRIPE_PRICE_ID: 'price_plus_month'
      },
      {
        siteId: 'test-cottage-free',
        customerId: 'cus_free',
        priorSubscriptionId: 'sub_free',
        successUrl: 'https://lovely-home.co.uk/account?upgraded=1',
        cancelUrl: 'https://lovely-home.co.uk/account?upgrade_canceled=1',
        mode: 'test'
      }
    );

    expect(result.ok).toBe(true);
    expect(result.url).toBe('https://checkout.stripe.com/upgrade');
    const body = String(fetchMock.mock.calls[0]?.[1]?.body ?? '');
    expect(body).toContain('customer=cus_free');
    expect(body).toContain('prior_subscription_id');
    expect(body).toContain('upgrade_from');

    vi.unstubAllGlobals();
  });

  it('creates a free subscription on an existing customer for downgrade', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'sub_free_new', status: 'active', trial_end: null })
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createFreeSubscriptionOnCustomer(
      {
        STRIPE_SECRET_KEY: 'sk_test',
        STRIPE_PRICE_ID_FREE: 'price_free_test'
      },
      {
        customerId: 'cus_plus',
        siteId: 'kitchen-home',
        priorSubscriptionId: 'sub_plus',
        downgradeFrom: 'plus',
        mode: 'test'
      }
    );

    expect(result.ok).toBe(true);
    expect(result.subscriptionId).toBe('sub_free_new');
    const body = String(fetchMock.mock.calls[0]?.[1]?.body ?? '');
    expect(body).toContain('downgrade_from');
    expect(body).toContain('prior_subscription_id');
    vi.unstubAllGlobals();
  });

  it('downgrades Plus to Free without leaving billing on the canceled Plus sub', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    await db
      .prepare(
        `INSERT INTO site_billing (site_id, stripe_customer_id, stripe_subscription_id, status, plan_tier, owner_email, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind('kitchen-home', 'cus_plus', 'sub_plus', 'active', 'plus', 'owner@example.com', 1, 1)
      .run();

    const fetchMock = vi.fn(async (url, init) => {
      if (String(url).includes('/subscriptions') && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ id: 'sub_free_new', status: 'active', trial_end: null })
        };
      }
      if (String(url).includes('/subscriptions/sub_plus') && init?.method === 'DELETE') {
        return { ok: true, json: async () => ({ id: 'sub_plus', status: 'canceled' }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await downgradePlusToFreeSubscription(
      {
        STRIPE_SECRET_KEY: 'sk_test',
        STRIPE_PRICE_ID_FREE: 'price_free_test'
      },
      db,
      {
        siteId: 'kitchen-home',
        customerId: 'cus_plus',
        priorSubscriptionId: 'sub_plus',
        ownerEmail: 'owner@example.com',
        mode: 'test'
      }
    );

    expect(result.ok).toBe(true);
    expect(result.subscriptionId).toBe('sub_free_new');
    const stored = await db
      .prepare('SELECT * FROM site_billing WHERE site_id = ?')
      .bind('kitchen-home')
      .first();
    expect(stored).toMatchObject({
      stripe_subscription_id: 'sub_free_new',
      status: 'active',
      plan_tier: 'free'
    });
    vi.unstubAllGlobals();
  });

  it('closes a free hub by canceling Stripe and enqueueing teardown', async () => {
    const db = /** @type {D1Database} */ ({
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async run() {
                return { meta: { changes: 1 } };
              },
              async first() {
                if (sql.includes('SELECT') && args[0] === 'kitchen-home') {
                  return {
                    site_id: 'kitchen-home',
                    stripe_customer_id: 'cus_free',
                    stripe_subscription_id: 'sub_free',
                    status: 'active',
                    plan_tier: 'free',
                    owner_email: 'owner@example.com',
                    provision_dispatched_at: Date.now()
                  };
                }
                return null;
              }
            };
          }
        };
      }
    });
    const queue = { send: vi.fn(async () => ({})) };
    const fetchMock = vi.fn(async (url, init) => {
      if (String(url).includes('/subscriptions/sub_free') && init?.method === 'DELETE') {
        return { ok: true, json: async () => ({ id: 'sub_free', status: 'canceled' }) };
      }
      if (String(url).includes('api.resend.com')) {
        return { ok: true, json: async () => ({ id: 'email_1' }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await closeFreeHubSubscription(
      {
        STRIPE_SECRET_KEY: 'sk_test',
        RESEND_API_KEY: 're_test',
        HUB_PROVISION_QUEUE: queue
      },
      db,
      { sites: { 'kitchen-home': { siteId: 'kitchen-home', contract: { d1_database_id: 'abc' } } } },
      {
        siteId: 'kitchen-home',
        customerId: 'cus_free',
        subscriptionId: 'sub_free',
        ownerEmail: 'owner@example.com',
        mode: 'test'
      }
    );

    expect(result.ok).toBe(true);
    expect(queue.send).toHaveBeenCalledWith({ siteId: 'kitchen-home', action: 'teardown' });
    vi.unstubAllGlobals();
  });

  it('cancels the prior free subscription after upgrade', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'sub_free', status: 'canceled' })
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await cancelPriorSubscriptionAfterUpgrade(
      { STRIPE_SECRET_KEY: 'sk_test' },
      {
        priorSubscriptionId: 'sub_free',
        newSubscriptionId: 'sub_plus',
        siteId: 'test-cottage-free',
        mode: 'test'
      }
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe('prior_subscription_canceled');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/subscriptions/sub_free');

    vi.unstubAllGlobals();
  });
});

describe('verifyStripeWebhookSignature', () => {
  it('accepts a valid Stripe-Signature header', async () => {
    const secret = 'whsec_test_secret';
    const payload = '{"id":"evt_test","type":"customer.subscription.created"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const digest = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
    const header = `t=${timestamp},v1=${digest}`;

    const result = await verifyStripeWebhookSignature(payload, header, secret);
    expect(result.ok).toBe(true);
  });

  it('rejects tampered payloads', async () => {
    const secret = 'whsec_test_secret';
    const payload = '{"id":"evt_test"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `t=${timestamp},v1=deadbeef`;

    const result = await verifyStripeWebhookSignature(payload, header, secret);
    expect(result.ok).toBe(false);
  });
});

/**
 * Minimal D1 mock for billing SQL used in tests.
 */
function createBillingDbMock() {
  /** @type {Map<string, Record<string, unknown>>} */
  const siteBilling = new Map();
  /** @type {Set<string>} */
  const webhookEvents = new Set();

  return {
    prepare(sql) {
      /** @type {unknown[]} */
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async run() {
          if (sql.includes('INSERT INTO site_billing')) {
            const hasPlanTier = sql.includes('plan_tier');
            const existing = siteBilling.get(String(bound[0]));
            const [
              site_id,
              stripe_customer_id,
              stripe_subscription_id,
              status,
              trial_end,
              archive_r2_key,
              owner_email,
              planOrCreated,
              createdOrUpdated,
              updatedAt
            ] = bound;
            const plan_tier = hasPlanTier ? planOrCreated : existing?.plan_tier ?? null;
            const created_at = hasPlanTier ? createdOrUpdated : planOrCreated;
            const updated_at = hasPlanTier ? updatedAt : createdOrUpdated;
            siteBilling.set(String(site_id), {
              site_id,
              stripe_customer_id,
              stripe_subscription_id,
              status,
              trial_end,
              archive_r2_key,
              owner_email,
              plan_tier,
              created_at: existing?.created_at ?? created_at,
              updated_at
            });
          }
          if (sql.includes('INSERT OR IGNORE INTO stripe_webhook_events')) {
            webhookEvents.add(String(bound[0]));
          }
          if (sql.includes('UPDATE site_billing SET') && sql.includes('_email_sent_at')) {
            const column = sql.includes('signup_email_sent_at')
              ? 'signup_email_sent_at'
              : sql.includes('trial_ending_email_sent_at')
                ? 'trial_ending_email_sent_at'
                : sql.includes('past_due_email_sent_at')
                  ? 'past_due_email_sent_at'
                  : 'canceled_email_sent_at';
            if (sql.includes(`${column} = NULL`)) {
              const siteId = String(bound[1]);
              const row = siteBilling.get(siteId);
              if (row) {
                row[column] = null;
                row.updated_at = bound[0];
              }
              return { success: true, meta: { changes: row ? 1 : 0 } };
            }
            const siteId = String(bound[2]);
            const row = siteBilling.get(siteId);
            const claimed = Boolean(row) && row[column] == null;
            if (claimed) {
              row[column] = bound[0];
              row.updated_at = bound[1];
            }
            return { success: true, meta: { changes: claimed ? 1 : 0 } };
          }
          return { success: true };
        },
        async first() {
          if (sql.includes('FROM site_billing WHERE stripe_subscription_id')) {
            const id = String(bound[0]);
            return [...siteBilling.values()].find((row) => row.stripe_subscription_id === id) ?? null;
          }
          if (sql.includes('FROM site_billing WHERE site_id')) {
            return siteBilling.get(String(bound[0])) ?? null;
          }
          if (sql.includes('FROM stripe_webhook_events')) {
            return webhookEvents.has(String(bound[0])) ? { event_id: bound[0] } : null;
          }
          return null;
        },
        async all() {
          if (sql.includes('FROM site_billing ORDER BY')) {
            return { results: [...siteBilling.values()] };
          }
          return { results: [] };
        }
      };
    }
  };
}

describe('resolveBillingOwnerEmail', () => {
  it('falls back to the signup reservation and Stripe customer email', async () => {
    const db = /** @type {D1Database} */ ({
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() {
                if (sql.includes('FROM signup_slug_reservations')) {
                  return String(args[0]) === 'smith'
                    ? { owner_email: 'reserved@example.com' }
                    : null;
                }
                return null;
              }
            };
          }
        };
      }
    });

    const fromReservation = await resolveBillingOwnerEmail(
      db,
      { STRIPE_SECRET_KEY: 'sk_test_abc' },
      { siteId: 'smith', customerId: 'cus_123' }
    );
    expect(fromReservation).toBe('reserved@example.com');

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ email: 'stripe@example.com' })
    }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const fromStripe = await resolveBillingOwnerEmail(
        db,
        { STRIPE_SECRET_KEY: 'sk_test_abc' },
        { siteId: 'rose', customerId: 'cus_rose', mode: 'test' }
      );
      expect(fromStripe).toBe('stripe@example.com');
      expect(fetchImpl).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/customers/cus_rose',
        expect.objectContaining({ method: 'GET' })
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('handleStripeBillingEvent', () => {
  it('records checkout.session.completed as active', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    const result = await handleStripeBillingEvent(db, {
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_123',
          subscription: 'sub_123',
          metadata: { site_id: 'smith' },
          customer_details: { email: 'owner@example.com' }
        }
      }
    });

    expect(result.ok).toBe(true);
    const stored = await db.prepare('SELECT * FROM site_billing WHERE site_id = ?').bind('smith').first();
    expect(stored).toMatchObject({
      site_id: 'smith',
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
      status: 'active',
      owner_email: 'owner@example.com'
    });
  });

  it('updates subscription status from customer.subscription.updated', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    await handleStripeBillingEvent(db, {
      id: 'evt_checkout_2',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_456',
          subscription: 'sub_456',
          metadata: { site_id: 'practice' },
          customer_email: 'practice@example.com'
        }
      }
    });

    const updated = await handleStripeBillingEvent(db, {
      id: 'evt_sub_updated',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_456',
          customer: 'cus_456',
          status: 'active',
          metadata: { site_id: 'practice' },
          trial_end: null
        }
      }
    });

    expect(updated.ok).toBe(true);
    const stored = await db.prepare('SELECT * FROM site_billing WHERE site_id = ?').bind('practice').first();
    expect(stored).toMatchObject({
      site_id: 'practice',
      status: 'active'
    });
  });

  it('detects a replacement active subscription for the same site', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/subscriptions')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'sub_plus',
                metadata: { site_id: 'test-cottage-free' }
              }
            ]
          })
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const hasReplacement = await customerHasActiveSiteSubscription(
      { STRIPE_SECRET_KEY: 'sk_test' },
      'test',
      'cus_free',
      'test-cottage-free',
      'sub_free'
    );
    expect(hasReplacement).toBe(true);
    vi.unstubAllGlobals();
  });

  it('ignores subscription.deleted when Stripe still has an active Plus subscription for the site', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    await handleStripeBillingEvent(db, {
      id: 'evt_free_signup',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_free',
          subscription: 'sub_free',
          metadata: { site_id: 'test-cottage-free' },
          customer_details: { email: 'owner@example.com' }
        }
      }
    });

    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/subscriptions?')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ id: 'sub_plus', metadata: { site_id: 'test-cottage-free' } }]
          })
        };
      }
      if (String(url).includes('/subscriptions/sub_')) {
        return {
          ok: true,
          json: async () => ({
            id: 'sub_free',
            items: { data: [{ price: { id: 'price_free_test', unit_amount: 0 } }] }
          })
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const deleted = await handleStripeBillingEvent(
      db,
      {
        id: 'evt_free_sub_deleted_race',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_free',
            customer: 'cus_free',
            status: 'canceled',
            metadata: { site_id: 'test-cottage-free' },
            items: { data: [{ price: { id: 'price_free_test', unit_amount: 0 } }] }
          }
        }
      },
      { env: { STRIPE_SECRET_KEY: 'sk_test', STRIPE_PRICE_ID: 'price_plus_month', STRIPE_PRICE_ID_FREE: 'price_free_test' } }
    );

    expect(deleted).toEqual({ ok: true, action: 'superseded_subscription_deleted_ignored' });
    const stored = await db
      .prepare('SELECT * FROM site_billing WHERE site_id = ?')
      .bind('test-cottage-free')
      .first();
    expect(stored).toMatchObject({
      stripe_subscription_id: 'sub_free',
      status: 'active'
    });
    vi.unstubAllGlobals();
  });

  it('ignores subscription.deleted for a superseded free subscription after upgrade', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    await handleStripeBillingEvent(db, {
      id: 'evt_upgrade_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_free',
          subscription: 'sub_plus',
          metadata: { site_id: 'test-cottage-free', upgrade_from: 'free', prior_subscription_id: 'sub_free' },
          customer_details: { email: 'owner@example.com' }
        }
      }
    });

    const deleted = await handleStripeBillingEvent(db, {
      id: 'evt_free_sub_deleted',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_free',
          customer: 'cus_free',
          status: 'canceled',
          metadata: { site_id: 'test-cottage-free' },
          items: { data: [{ price: { id: 'price_free_test', unit_amount: 0 } }] }
        }
      }
    });

    expect(deleted).toEqual({ ok: true, action: 'stale_subscription_ignored' });
    const stored = await db
      .prepare('SELECT * FROM site_billing WHERE site_id = ?')
      .bind('test-cottage-free')
      .first();
    expect(stored).toMatchObject({
      stripe_subscription_id: 'sub_plus',
      status: 'active'
    });
  });

  it('ignores duplicate webhook event ids', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    const event = {
      id: 'evt_dup',
      type: 'customer.subscription.trial_will_end',
      data: { object: {} }
    };
    const first = await handleStripeBillingEvent(db, event);
    const second = await handleStripeBillingEvent(db, event);
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: true, action: 'duplicate_ignored' });
  });
});
