import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  encodeStripeFormEntries,
  handleStripeBillingEvent,
  mapStripeSubscriptionStatus,
  stripeTimestampToMs,
  timingSafeEqualHex,
  TRIAL_PERIOD_DAYS,
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

  it('uses a 7-day Stripe trial', () => {
    expect(TRIAL_PERIOD_DAYS).toBe(7);
  });

  it('encodes nested Stripe form params', () => {
    const entries = encodeStripeFormEntries({
      mode: 'subscription',
      line_items: [{ price: 'price_123', quantity: 1 }],
      subscription_data: { trial_period_days: TRIAL_PERIOD_DAYS, metadata: { site_id: 'smith' } }
    });
    const params = Object.fromEntries(entries);
    expect(params.mode).toBe('subscription');
    expect(params['line_items[0][price]']).toBe('price_123');
    expect(params['subscription_data[trial_period_days]']).toBe(String(TRIAL_PERIOD_DAYS));
    expect(params['subscription_data[metadata][site_id]']).toBe('smith');
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
            const [
              site_id,
              stripe_customer_id,
              stripe_subscription_id,
              status,
              trial_end,
              archive_r2_key,
              owner_email,
              created_at,
              updated_at
            ] = bound;
            const existing = siteBilling.get(String(site_id));
            siteBilling.set(String(site_id), {
              site_id,
              stripe_customer_id,
              stripe_subscription_id,
              status,
              trial_end,
              archive_r2_key,
              owner_email,
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

describe('handleStripeBillingEvent', () => {
  it('records checkout.session.completed as trialing', async () => {
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
      status: 'trialing',
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
