import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  normalizeReferralBillingInterval,
  referralBenefitCopy,
  referralCouponIdForInterval,
  validateReferralForSignup,
  markReferralUsedAtCheckout,
  fulfillReferrerRewardOnInvoicePaid,
  previewReferralCode,
  createReferralCodeForSite,
  isReferrerEligible,
  markReferrerEligibleOnFirstPaidInvoice,
  REFERRAL_CODE_RE
} from '../functions/api/platform/platformReferrals.js';
import { getSiteBilling, getSiteBillingBySubscriptionId, stripeApiRequest } from '../functions/api/platform/platformBilling.js';

vi.mock('../functions/api/platform/platformBilling.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getSiteBilling: vi.fn(),
    getSiteBillingBySubscriptionId: vi.fn(),
    stripeApiRequest: vi.fn()
  };
});

vi.mock('../functions/api/platform/platformStripeMode.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getStripeMode: vi.fn(async () => 'test')
  };
});

const env = {
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_REFERRAL_COUPON_MONTHLY: 'coupon_month_test',
  STRIPE_REFERRAL_COUPON_YEARLY: 'coupon_year_test',
  MARKETING_SITE_ORIGIN: 'https://lovely-home.co.uk'
};

function makeDb(state = {}) {
  const rows = new Map(Object.entries(state.rows ?? {}));
  const billing =
    state.billing instanceof Map ? state.billing : new Map(Object.entries(state.billing ?? {}));
  return /** @type {D1Database} */ ({
    prepare(sql) {
      const query = sql.replace(/\s+/g, ' ').trim();
      return {
        bind(...args) {
          return {
            async first() {
              if (query.includes('FROM referral_codes WHERE code = ?')) {
                return rows.get(String(args[0])) ?? null;
              }
              if (query.includes('used_by_site_id = ?')) {
                const siteId = String(args[0]);
                for (const row of rows.values()) {
                  if (
                    String(row.used_by_site_id) === siteId &&
                    String(row.status) === 'used' &&
                    !row.referrer_rewarded_at
                  ) {
                    return row;
                  }
                }
                return null;
              }
              if (query.includes('SELECT COUNT(*) AS count')) {
                return { count: state.createdToday ?? 0 };
              }
              if (query.includes('FROM site_billing WHERE site_id = ?')) {
                return billing.get(String(args[0])) ?? null;
              }
              return null;
            },
            async run() {
              if (query.startsWith('UPDATE site_billing') && query.includes('referrer_eligible_at')) {
                const siteId = String(args[2]);
                const row = billing.get(siteId);
                if (row && !row.referrer_eligible_at) {
                  billing.set(siteId, { ...row, referrer_eligible_at: args[0] });
                  return { meta: { changes: 1 } };
                }
                return { meta: { changes: 0 } };
              }
              if (query.startsWith('UPDATE referral_codes') && query.includes("status = 'reserved'")) {
                const code = String(args[4]);
                const row = rows.get(code);
                if (!row || row.status !== 'active') {
                  return { meta: { changes: 0 } };
                }
                rows.set(code, {
                  ...row,
                  status: 'reserved',
                  reserved_at: args[0],
                  reserved_email: args[1],
                  reserved_site_id: args[2],
                  stripe_session_id: args[3]
                });
                return { meta: { changes: 1 } };
              }
              if (query.startsWith('UPDATE referral_codes') && query.includes("status = 'used'")) {
                const code = String(args[3]);
                const row = rows.get(code);
                if (!row || !['active', 'reserved'].includes(String(row.status))) {
                  return { meta: { changes: 0 } };
                }
                rows.set(code, {
                  ...row,
                  status: 'used',
                  used_at: args[0],
                  used_by_site_id: args[1],
                  stripe_session_id: args[2]
                });
                return { meta: { changes: 1 } };
              }
              if (query.startsWith('UPDATE referral_codes SET referrer_rewarded_at')) {
                const code = String(args[1]);
                const row = rows.get(code);
                if (row) rows.set(code, { ...row, referrer_rewarded_at: args[0] });
                return { meta: { changes: 1 } };
              }
              if (query.startsWith('UPDATE referral_codes') && query.includes("status = 'revoked'")) {
                return { meta: { changes: 1 } };
              }
              if (query.startsWith('INSERT INTO referral_codes')) {
                rows.set(String(args[0]), {
                  code: args[0],
                  referrer_site_id: args[1],
                  billing_interval: args[2],
                  status: 'active',
                  created_at: args[3]
                });
                return { meta: { changes: 1 } };
              }
              if (query.startsWith('UPDATE referral_codes') && query.includes('reserved_at IS NOT NULL')) {
                return { meta: { changes: 0 } };
              }
              return { meta: { changes: 0 } };
            }
          };
        }
      };
    }
  });
}

describe('platformReferrals', () => {
  beforeEach(() => {
    vi.mocked(getSiteBilling).mockReset();
    vi.mocked(getSiteBillingBySubscriptionId).mockReset();
    vi.mocked(stripeApiRequest).mockReset();
  });

  it('describes monthly and yearly benefits', () => {
    expect(referralBenefitCopy('month').referee).toMatch(/first invoice/i);
    expect(referralBenefitCopy('year').referrer).toMatch(/first invoice is paid/i);
  });

  it('resolves coupon ids from env', () => {
    expect(referralCouponIdForInterval(env, 'test', 'month')).toBe('coupon_month_test');
    expect(referralCouponIdForInterval(env, 'test', 'year')).toBe('coupon_year_test');
  });

  it('previews an active referral code', async () => {
    const db = makeDb({
      rows: {
        'LH-ABCD-2345': {
          code: 'LH-ABCD-2345',
          referrer_site_id: 'wagtail',
          billing_interval: 'month',
          status: 'active'
        }
      }
    });
    const preview = await previewReferralCode(db, 'lh-abcd-2345');
    expect(preview.valid).toBe(true);
    expect(preview.code).toBe('LH-ABCD-2345');
  });

  it('rejects self-referral and plan mismatch', async () => {
    const db = makeDb({
      rows: {
        'LH-ABCD-2345': {
          code: 'LH-ABCD-2345',
          referrer_site_id: 'wagtail',
          billing_interval: 'year',
          status: 'active'
        }
      }
    });
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'wagtail',
      status: 'active',
      owner_email: 'owner@example.com',
      stripe_customer_id: 'cus_ref',
      referrer_eligible_at: 1_700_000_000_000
    });

    const selfSite = await validateReferralForSignup(db, {
      code: 'LH-ABCD-2345',
      refereeSiteId: 'wagtail',
      refereeEmail: 'friend@example.com'
    });
    expect(selfSite.ok).toBe(false);

    const selfEmail = await validateReferralForSignup(db, {
      code: 'LH-ABCD-2345',
      refereeSiteId: 'rose-cottage',
      refereeEmail: 'owner@example.com',
      billingInterval: 'year'
    });
    expect(selfEmail.ok).toBe(false);

    const mismatch = await validateReferralForSignup(db, {
      code: 'LH-ABCD-2345',
      refereeSiteId: 'rose-cottage',
      refereeEmail: 'friend@example.com',
      billingInterval: 'month'
    });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.error).toBe('REFERRAL_PLAN_MISMATCH');
  });

  it('accepts a valid referral for signup', async () => {
    const db = makeDb({
      rows: {
        'LH-ABCD-2345': {
          code: 'LH-ABCD-2345',
          referrer_site_id: 'wagtail',
          billing_interval: 'month',
          status: 'active'
        }
      }
    });
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'wagtail',
      status: 'active',
      owner_email: 'owner@example.com',
      stripe_customer_id: 'cus_ref',
      referrer_eligible_at: 1_700_000_000_000
    });

    const result = await validateReferralForSignup(db, {
      code: 'LH-ABCD-2345',
      refereeSiteId: 'rose-cottage',
      refereeEmail: 'friend@example.com',
      billingInterval: 'month'
    });
    expect(result).toEqual({
      ok: true,
      referral: {
        code: 'LH-ABCD-2345',
        referrerSiteId: 'wagtail',
        billingInterval: 'month'
      }
    });
  });

  it('marks a referral used at checkout without crediting the referrer', async () => {
    const db = makeDb({
      rows: {
        'LH-ABCD-2345': {
          code: 'LH-ABCD-2345',
          referrer_site_id: 'wagtail',
          billing_interval: 'month',
          status: 'reserved',
          stripe_session_id: 'cs_test_1'
        }
      }
    });

    const marked = await markReferralUsedAtCheckout(db, {
      sessionId: 'cs_test_1',
      refereeSiteId: 'rose-cottage',
      referralCode: 'LH-ABCD-2345',
      referrerSiteId: 'wagtail'
    });
    expect(marked.ok).toBe(true);
    expect(stripeApiRequest).not.toHaveBeenCalled();
  });

  it('credits the referrer on the referee first paid invoice', async () => {
    const db = makeDb({
      rows: {
        'LH-ABCD-2345': {
          code: 'LH-ABCD-2345',
          referrer_site_id: 'wagtail',
          billing_interval: 'month',
          status: 'used',
          used_by_site_id: 'rose-cottage',
          referrer_rewarded_at: null
        }
      }
    });
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'wagtail',
      status: 'active',
      owner_email: 'owner@example.com',
      stripe_customer_id: 'cus_ref',
      referrer_eligible_at: 1_700_000_000_000
    });
    vi.mocked(stripeApiRequest).mockResolvedValue({ id: 'cbtxn_1' });

    const fulfilled = await fulfillReferrerRewardOnInvoicePaid(env, db, {
      invoiceId: 'in_test_1',
      refereeSiteId: 'rose-cottage',
      amountPaid: 999
    });
    expect(fulfilled.ok).toBe(true);
    expect(stripeApiRequest).toHaveBeenCalledWith(
      expect.any(String),
      'POST',
      '/customers/cus_ref/balance_transactions',
      expect.objectContaining({ amount: -1000, currency: 'gbp' })
    );
  });

  it('creates a referral code for an eligible hub', async () => {
    const db = makeDb({ createdToday: 0 });
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'wagtail',
      status: 'active',
      owner_email: 'owner@example.com',
      stripe_customer_id: 'cus_ref',
      referrer_eligible_at: 1_700_000_000_000
    });

    const result = await createReferralCodeForSite(db, env, {
      sessionEmail: 'owner@example.com',
      siteId: 'wagtail',
      billingInterval: 'year'
    });
    expect(result.ok).toBe(true);
    expect(result.body.code).toMatch(REFERRAL_CODE_RE);
    expect(result.body.url).toContain('ref=');
    expect(normalizeReferralBillingInterval(result.body.billingInterval)).toBe('year');
  });

  it('blocks referral generation during trial before first paid invoice', async () => {
    const db = makeDb({ createdToday: 0 });
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'wagtail',
      status: 'trialing',
      owner_email: 'owner@example.com',
      stripe_customer_id: 'cus_ref',
      referrer_eligible_at: null
    });

    const result = await createReferralCodeForSite(db, env, {
      sessionEmail: 'owner@example.com',
      siteId: 'wagtail'
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.body.error).toBe('REFERRAL_NOT_ELIGIBLE');
  });

  it('rejects signup when the referrer has not paid yet', async () => {
    const db = makeDb({
      rows: {
        'LH-ABCD-2345': {
          code: 'LH-ABCD-2345',
          referrer_site_id: 'wagtail',
          billing_interval: 'month',
          status: 'active'
        }
      }
    });
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'wagtail',
      status: 'trialing',
      owner_email: 'owner@example.com',
      stripe_customer_id: 'cus_ref',
      referrer_eligible_at: null
    });

    const result = await validateReferralForSignup(db, {
      code: 'LH-ABCD-2345',
      refereeSiteId: 'rose-cottage',
      refereeEmail: 'friend@example.com',
      billingInterval: 'month'
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('REFERRAL_REFERRER_NOT_ELIGIBLE');
  });

  it('marks referrer eligibility on first paid invoice', async () => {
    const billing = new Map([
      ['wagtail', { site_id: 'wagtail', referrer_eligible_at: null }]
    ]);
    const db = makeDb({ billing });

    expect(isReferrerEligible(billing.get('wagtail'))).toBe(false);
    const marked = await markReferrerEligibleOnFirstPaidInvoice(db, 'wagtail', 1_800_000_000_000);
    expect(marked.action).toBe('referrer_eligible_marked');
    expect(isReferrerEligible(billing.get('wagtail'))).toBe(true);
  });
});
