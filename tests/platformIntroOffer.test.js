import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  INTRO_OFFER_SETTING_KEY,
  applyIntroOfferSetting,
  describeIntroOffer,
  introCouponIdForInterval,
  introOfferBenefitCopy,
  introOfferConfigured,
  isEmailEligibleForIntroOffer,
  resolveIntroOfferForSignup
} from '../functions/api/platform/platformIntroOffer.js';

vi.mock('../functions/api/platform/platformBilling.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    listSiteBillingByOwnerEmail: vi.fn(async () => [])
  };
});

import { createBillingCheckoutSession, listSiteBillingByOwnerEmail } from '../functions/api/platform/platformBilling.js';

const env = {
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_ID: 'price_month',
  STRIPE_PRICE_ID_YEARLY: 'price_year',
  STRIPE_INTRO_COUPON_MONTHLY: 'intro_month_test',
  STRIPE_INTRO_COUPON_YEARLY: 'intro_year_test',
  STRIPE_REFERRAL_COUPON_MONTHLY: 'referral_month_test',
  STRIPE_REFERRAL_COUPON_YEARLY: 'referral_year_test'
};

/**
 * @param {Record<string, unknown>} [options]
 */
function makeSettingsDb(options = {}) {
  const settings = new Map(Object.entries(options.settings ?? {}));
  const billingRows = options.billingRows ?? [];
  return /** @type {D1Database} */ ({
    prepare(sql) {
      const query = sql.replace(/\s+/g, ' ').trim();
      return {
        bind(...args) {
          return {
            async first() {
              if (query.includes('FROM platform_settings WHERE key = ?')) {
                const key = String(args[0]);
                const value = settings.get(key);
                return value == null ? null : { value };
              }
              if (query.includes('SELECT COUNT(*) AS n FROM site_billing')) {
                return { n: 0 };
              }
              return null;
            },
            async all() {
              if (query.includes('FROM site_billing WHERE lower(owner_email) = ?')) {
                return { results: billingRows };
              }
              return { results: [] };
            },
            async run() {
              if (query.includes('INSERT INTO platform_settings')) {
                settings.set(String(args[0]), String(args[1]));
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            }
          };
        }
      };
    }
  });
}

describe('platform intro offer', () => {
  /** @type {typeof fetch} */
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.mocked(listSiteBillingByOwnerEmail).mockReset();
    vi.mocked(listSiteBillingByOwnerEmail).mockResolvedValue([]);
    global.fetch = vi.fn(async (_url, init) => {
      const body = init?.body ? Object.fromEntries(new URLSearchParams(String(init.body))) : {};
      return new Response(JSON.stringify({ id: 'cs_intro', url: 'https://checkout.stripe.com/intro', _body: body }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps intro coupon ids by mode and interval', () => {
    expect(introCouponIdForInterval(env, 'test', 'month')).toBe('intro_month_test');
    expect(introCouponIdForInterval(env, 'test', 'year')).toBe('intro_year_test');
    expect(
      introOfferConfigured({
        ...env,
        STRIPE_INTRO_COUPON_MONTHLY_LIVE: 'intro_month_live',
        STRIPE_INTRO_COUPON_YEARLY_LIVE: 'intro_year_live'
      }, 'live')
    ).toBe(true);
  });

  it('describes benefit copy for monthly and yearly plans', () => {
    expect(introOfferBenefitCopy('month')).toMatch(/25%/);
    expect(introOfferBenefitCopy('month')).toMatch(/first two Lovely Home\+ months/i);
    expect(introOfferBenefitCopy('year')).toMatch(/30%/);
    expect(introOfferBenefitCopy('year')).toMatch(/first Lovely Home\+ year/i);
  });

  it('treats unknown emails as eligible when they have no billing rows', async () => {
    const db = makeSettingsDb();
    await expect(isEmailEligibleForIntroOffer(db, 'new@example.com')).resolves.toBe(true);
  });

  it('rejects returning customers by email', async () => {
    vi.mocked(listSiteBillingByOwnerEmail).mockResolvedValue([{ site_id: 'smith', owner_email: 'owner@example.com' }]);
    const db = makeSettingsDb();
    await expect(isEmailEligibleForIntroOffer(db, 'owner@example.com')).resolves.toBe(false);
  });

  it('describes inactive intro offer when disabled in D1', async () => {
    const db = makeSettingsDb({ settings: { [INTRO_OFFER_SETTING_KEY]: 'false' } });
    const status = await describeIntroOffer(env, db);
    expect(status.enabled).toBe(false);
    expect(status.configured).toBe(true);
    expect(status.active).toBe(false);
  });

  it('resolves intro offer for eligible new signups without a referral', async () => {
    const db = makeSettingsDb({ settings: { [INTRO_OFFER_SETTING_KEY]: 'true' } });
    const result = await resolveIntroOfferForSignup(env, db, {
      customerEmail: 'new@example.com',
      billingInterval: 'year'
    });
    expect(result.apply).toBe(true);
    expect(result.interval).toBe('year');
    expect(result.benefit).toMatch(/first Lovely Home\+ year/i);
  });

  it('skips intro offer when a referral code is present', async () => {
    const db = makeSettingsDb({ settings: { [INTRO_OFFER_SETTING_KEY]: 'true' } });
    const result = await resolveIntroOfferForSignup(env, db, {
      customerEmail: 'new@example.com',
      referralCode: 'LH-ABCD-EFGH'
    });
    expect(result.apply).toBe(false);
    expect(result.reason).toBe('REFERRAL_PRESENT');
  });

  it('enables intro offer from the operator API when coupons exist', async () => {
    const db = makeSettingsDb({ settings: { [INTRO_OFFER_SETTING_KEY]: 'false' } });
    const result = await applyIntroOfferSetting(env, db, { enabled: true });
    expect(result.status).toBe(200);
    expect(result.body.active).toBe(true);
  });

  it('applies intro coupon on checkout when requested', async () => {
    const session = await createBillingCheckoutSession(env, {
      siteId: 'rose-cottage',
      customerEmail: 'new@example.com',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      billingInterval: 'month',
      applyIntroOffer: true
    });

    expect(session.ok).toBe(true);
    const fetchInit = /** @type {RequestInit} */ (vi.mocked(global.fetch).mock.calls[0][1]);
    const params = Object.fromEntries(new URLSearchParams(String(fetchInit.body)));
    expect(params['managed_payments[enabled]']).toBe('false');
    expect(params['automatic_tax[enabled]']).toBe('false');
    expect(params['discounts[0][coupon]']).toBe('intro_month_test');
    expect(params['metadata[intro_offer]']).toBe('1');
  });

  it('does not combine intro offer with referral checkout', async () => {
    await createBillingCheckoutSession(env, {
      siteId: 'rose-cottage',
      customerEmail: 'new@example.com',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      referralCode: 'LH-ABCD-EFGH',
      referrerSiteId: 'smith',
      applyIntroOffer: true
    });

    const fetchInit = /** @type {RequestInit} */ (vi.mocked(global.fetch).mock.calls[0][1]);
    const params = Object.fromEntries(new URLSearchParams(String(fetchInit.body)));
    expect(params['discounts[0][coupon]']).toBe('referral_month_test');
    expect(params['metadata[referral_code]']).toBe('LH-ABCD-EFGH');
    expect(params['metadata[intro_offer]']).toBeUndefined();
  });
});
