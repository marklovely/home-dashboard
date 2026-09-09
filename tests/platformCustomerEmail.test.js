import { describe, expect, it, vi } from 'vitest';
import {
  buildCustomerEmail,
  buildReferrerRewardEmail,
  customerEmailConfigured,
  customerHubUrl,
  formatReferralCreditGbp,
  formatUkDate,
  lifecycleEmailKindForEvent,
  markCustomerEmailSent,
  maybeSendCustomerLifecycleEmail,
  maybeSendReferrerRewardEmail,
  RESEND_EMAILS_URL
} from '../functions/api/platform/platformCustomerEmail.js';
import { handleStripeBillingEvent } from '../functions/api/platform/platformBilling.js';

describe('customer lifecycle email copy', () => {
  it('maps Stripe events to a single mail kind', () => {
    expect(lifecycleEmailKindForEvent({ eventType: 'checkout.session.completed' })).toBe('signup');
    expect(
      lifecycleEmailKindForEvent({ eventType: 'customer.subscription.created', status: 'trialing' })
    ).toBe('signup');
    expect(lifecycleEmailKindForEvent({ eventType: 'customer.subscription.trial_will_end' })).toBe(
      'trial_ending'
    );
    expect(lifecycleEmailKindForEvent({ eventType: 'invoice.payment_failed' })).toBe('past_due');
    expect(lifecycleEmailKindForEvent({ eventType: 'customer.subscription.deleted' })).toBe('canceled');
    expect(
      lifecycleEmailKindForEvent({ eventType: 'customer.subscription.updated', status: 'canceled' })
    ).toBe('canceled');
    expect(
      lifecycleEmailKindForEvent({ eventType: 'customer.subscription.updated', status: 'active' })
    ).toBeNull();
  });

  it('builds a signup confirmation with the hub URL', () => {
    const mail = buildCustomerEmail({ kind: 'signup', siteId: 'rose-cottage' });
    expect(mail.subject).toContain('rose-cottage.lovely-hub.com');
    expect(mail.text).toContain(customerHubUrl('rose-cottage'));
    expect(mail.text).toContain('signup-success?site=rose-cottage');
    expect(mail.text).toContain('/account');
    expect(mail.text).toMatch(/sitter, tenant, Airbnb guest/i);
    expect(mail.text).toMatch(/wall tablet is optional/i);
  });

  it('formats trial end dates in the UK', () => {
    expect(formatUkDate(Date.UTC(2026, 8, 7, 12))).toMatch(/September 2026/);
  });

  it('mentions full backup media and twelve-month hub name hold on cancel', () => {
    const mail = buildCustomerEmail({ kind: 'canceled', siteId: 'rose-cottage' });
    expect(mail.text).toMatch(/photos/i);
    expect(mail.text).toMatch(/appliance manuals/i);
    expect(mail.text).toMatch(/hub name/i);
    expect(mail.text).toMatch(/12 months/i);
    expect(mail.text).not.toMatch(/\bslug\b/i);
  });

  it('formats referral credit and builds a reward email', () => {
    expect(formatReferralCreditGbp(1000)).toBe('£10.00');
    const mail = buildReferrerRewardEmail({
      referrerSiteId: 'wagtail',
      creditPence: 1500,
      marketingOrigin: 'https://lovely-home.co.uk'
    });
    expect(mail.subject).toContain('£15.00');
    expect(mail.text).toContain('Applied balance');
    expect(mail.text).toContain('https://lovely-home.co.uk/account');
    expect(mail.text).toContain(customerHubUrl('wagtail'));
  });
});

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
              ...existing,
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
          return { results: [...siteBilling.values()] };
        }
      };
    }
  };
}

describe('maybeSendCustomerLifecycleEmail', () => {
  it('claims the sent-at column only once', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    await db
      .prepare(
        `INSERT INTO site_billing (
        site_id, stripe_customer_id, stripe_subscription_id, status,
        trial_end, archive_r2_key, owner_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind('rose', 'cus_1', 'sub_1', 'trialing', null, null, 'owner@example.com', 1, 1)
      .run();
    expect(await markCustomerEmailSent(db, 'rose', 'signup_email_sent_at')).toBe(true);
    expect(await markCustomerEmailSent(db, 'rose', 'signup_email_sent_at')).toBe(false);
  });

  it('is inert without RESEND_API_KEY', async () => {
    expect(customerEmailConfigured({})).toBe(false);
    const result = await maybeSendCustomerLifecycleEmail(
      {},
      /** @type {D1Database} */ (createBillingDbMock()),
      { eventType: 'checkout.session.completed', siteId: 'rose', ownerEmail: 'a@b.com' }
    );
    expect(result).toEqual({ ok: true, action: 'email_not_configured' });
  });

  it('sends via Resend and records the sent timestamp', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'email_1' })
    }));
    const db = /** @type {D1Database} */ (createBillingDbMock());
    await db
      .prepare(
        `INSERT INTO site_billing (
        site_id, stripe_customer_id, stripe_subscription_id, status,
        trial_end, archive_r2_key, owner_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind('rose', 'cus_1', 'sub_1', 'trialing', null, null, 'owner@example.com', 1, 1)
      .run();

    const result = await maybeSendCustomerLifecycleEmail(
      { RESEND_API_KEY: 're_test' },
      db,
      {
        eventType: 'checkout.session.completed',
        status: 'trialing',
        siteId: 'rose',
        ownerEmail: 'owner@example.com'
      },
      /** @type {typeof fetch} */ (fetchImpl)
    );

    expect(result).toEqual({ ok: true, action: 'email_signup_sent' });
    expect(fetchImpl).toHaveBeenCalledWith(
      RESEND_EMAILS_URL,
      expect.objectContaining({
        method: 'POST'
      })
    );
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.to).toEqual(['owner@example.com']);
    expect(body.from).toContain('support@lovely-home.co.uk');
    expect(body.subject).toContain('rose.lovely-hub.com');

    const stored = await db.prepare('SELECT * FROM site_billing WHERE site_id = ?').bind('rose').first();
    expect(stored.signup_email_sent_at).toBeTruthy();

    const again = await maybeSendCustomerLifecycleEmail(
      { RESEND_API_KEY: 're_test' },
      db,
      {
        eventType: 'checkout.session.completed',
        siteId: 'rose',
        ownerEmail: 'owner@example.com',
        existingBilling: stored
      },
      /** @type {typeof fetch} */ (fetchImpl)
    );
    expect(again.action).toBe('email_already_sent');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('lets only one of checkout.session.completed and subscription.created send', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'email_race' })
    }));
    const db = /** @type {D1Database} */ (createBillingDbMock());
    await db
      .prepare(
        `INSERT INTO site_billing (
        site_id, stripe_customer_id, stripe_subscription_id, status,
        trial_end, archive_r2_key, owner_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind('rose', 'cus_1', 'sub_1', 'trialing', null, null, 'owner@example.com', 1, 1)
      .run();

    const env = { RESEND_API_KEY: 're_test' };
    const base = {
      status: 'trialing',
      siteId: 'rose',
      ownerEmail: 'owner@example.com'
    };
    const [fromCheckout, fromSubscription] = await Promise.all([
      maybeSendCustomerLifecycleEmail(
        env,
        db,
        { ...base, eventType: 'checkout.session.completed' },
        /** @type {typeof fetch} */ (fetchImpl)
      ),
      maybeSendCustomerLifecycleEmail(
        env,
        db,
        { ...base, eventType: 'customer.subscription.created' },
        /** @type {typeof fetch} */ (fetchImpl)
      )
    ]);

    expect([fromCheckout.action, fromSubscription.action].sort()).toEqual([
      'email_already_sent',
      'email_signup_sent'
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('clears the sent marker when Resend fails so Stripe can retry', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Resend down' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email_retry' })
      });
    const db = /** @type {D1Database} */ (createBillingDbMock());
    await db
      .prepare(
        `INSERT INTO site_billing (
        site_id, stripe_customer_id, stripe_subscription_id, status,
        trial_end, archive_r2_key, owner_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind('rose', 'cus_1', 'sub_1', 'trialing', null, null, 'owner@example.com', 1, 1)
      .run();

    const failed = await maybeSendCustomerLifecycleEmail(
      { RESEND_API_KEY: 're_test' },
      db,
      {
        eventType: 'checkout.session.completed',
        siteId: 'rose',
        ownerEmail: 'owner@example.com'
      },
      /** @type {typeof fetch} */ (fetchImpl)
    );
    expect(failed.ok).toBe(false);

    const stored = await db.prepare('SELECT * FROM site_billing WHERE site_id = ?').bind('rose').first();
    expect(stored.signup_email_sent_at).toBeFalsy();

    const retried = await maybeSendCustomerLifecycleEmail(
      { RESEND_API_KEY: 're_test' },
      db,
      {
        eventType: 'checkout.session.completed',
        siteId: 'rose',
        ownerEmail: 'owner@example.com'
      },
      /** @type {typeof fetch} */ (fetchImpl)
    );
    expect(retried).toEqual({ ok: true, action: 'email_signup_sent' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('referrer reward email', () => {
  it('sends once per fulfilled referral code', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'email_ref_1' })
    }));
    /** @type {{ code: string; referrer_rewarded_at: number | null; referrer_reward_email_sent_at: number | null }} */
    const row = {
      code: 'LH-ABCD-2345',
      referrer_rewarded_at: 1_700_000_000_000,
      referrer_reward_email_sent_at: null
    };
    const db = /** @type {D1Database} */ ({
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async run() {
                if (sql.includes('referrer_reward_email_sent_at = ?') && sql.includes('referrer_rewarded_at IS NOT NULL')) {
                  if (!row.referrer_rewarded_at || row.referrer_reward_email_sent_at) {
                    return { meta: { changes: 0 } };
                  }
                  row.referrer_reward_email_sent_at = Number(args[0]);
                  return { meta: { changes: 1 } };
                }
                if (sql.includes('referrer_reward_email_sent_at = NULL')) {
                  row.referrer_reward_email_sent_at = null;
                  return { meta: { changes: 1 } };
                }
                return { meta: { changes: 0 } };
              }
            };
          }
        };
      }
    });

    const sent = await maybeSendReferrerRewardEmail(
      { RESEND_API_KEY: 're_test' },
      db,
      {
        referralCode: 'LH-ABCD-2345',
        referrerSiteId: 'wagtail',
        ownerEmail: 'owner@example.com',
        creditPence: 1000
      },
      /** @type {typeof fetch} */ (fetchImpl)
    );
    expect(sent).toEqual({ ok: true, action: 'referral_email_sent' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const again = await maybeSendReferrerRewardEmail(
      { RESEND_API_KEY: 're_test' },
      db,
      {
        referralCode: 'LH-ABCD-2345',
        referrerSiteId: 'wagtail',
        ownerEmail: 'owner@example.com',
        creditPence: 1000
      },
      /** @type {typeof fetch} */ (fetchImpl)
    );
    expect(again).toEqual({ ok: true, action: 'referral_email_already_sent' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('handleStripeBillingEvent sends signup mail', () => {
  it('emails the owner after checkout when Resend is configured', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'email_2' })
    }));
    const db = /** @type {D1Database} */ (createBillingDbMock());
    const result = await handleStripeBillingEvent(
      db,
      {
        id: 'evt_mail_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_mail',
            subscription: 'sub_mail',
            metadata: { site_id: 'blundell' },
            customer_details: { email: 'owner@example.com' }
          }
        }
      },
      { env: { RESEND_API_KEY: 're_test' }, fetchImpl: /** @type {typeof fetch} */ (fetchImpl) }
    );

    expect(result.ok).toBe(true);
    expect(result.email).toEqual({ ok: true, action: 'email_signup_sent' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns 503-style failure when Resend errors so Stripe can retry', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Resend down' })
    }));
    const db = /** @type {D1Database} */ (createBillingDbMock());
    const result = await handleStripeBillingEvent(
      db,
      {
        id: 'evt_mail_fail',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_fail',
            subscription: 'sub_fail',
            metadata: { site_id: 'failhub' },
            customer_details: { email: 'owner@example.com' }
          }
        }
      },
      { env: { RESEND_API_KEY: 're_test' }, fetchImpl: /** @type {typeof fetch} */ (fetchImpl) }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('EMAIL_SEND_FAILED');
  });
});
