import { describe, expect, it } from 'vitest';
import {
  MARKETING_PRICING_SETTING_KEY,
  applyMarketingPricingOverrides,
  applyMarketingPricingSetting,
  effectiveReferralCopy,
  parseMarketingPricingOverrides,
  sanitizeMarketingText
} from '../functions/api/platform/platformMarketingPricing.js';
import { buildPublicPricingFromPlans } from '../functions/api/platform/platformPublicPricing.js';

/**
 * @param {Record<string, unknown>} [options]
 */
function makeSettingsDb(options = {}) {
  const settings = new Map(Object.entries(options.settings ?? {}));
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
              return null;
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

describe('platform marketing pricing', () => {
  it('sanitizes HTML and trims marketing text', () => {
    expect(sanitizeMarketingText('  Hello <b>world</b>  ')).toBe('Hello world');
  });

  it('parses nested override JSON', () => {
    const parsed = parseMarketingPricingOverrides({
      monthlyLabel: '£8.99/month',
      introOffer: { monthlyBenefit: '20% off month one' },
      referral: { monthlyReferee: '£4 off month one' }
    });
    expect(parsed.monthlyLabel).toBe('£8.99/month');
    expect(parsed.introOffer?.monthlyBenefit).toBe('20% off month one');
    expect(parsed.referral?.monthlyReferee).toBe('£4 off month one');
  });

  it('applies display overrides without changing Stripe amounts', () => {
    const stripePricing = buildPublicPricingFromPlans(
      {
        month: {
          interval: 'month',
          label: '£9.99/month',
          amount: 9.99,
          unitAmountMinor: 999,
          currency: 'gbp'
        }
      },
      'Household Hub'
    );
    const effective = applyMarketingPricingOverrides(stripePricing, {
      monthlyLabel: '£8.99/month',
      checkoutSummary: 'Custom checkout copy.'
    });
    expect(effective.monthlyLabel).toBe('£8.99/month');
    expect(effective.checkoutSummary).toBe('Custom checkout copy.');
    expect(effective.plans.month?.unitAmountMinor).toBe(999);
    expect(effective.referral?.monthlyReferee).toMatch(/£5 off/);
  });

  it('uses referral copy overrides for previews', () => {
    const copy = effectiveReferralCopy('month', {
      referral: { monthlyReferee: '£4 off month one', monthlyReferrer: '£8 credit for you' }
    });
    expect(copy.referee).toBe('£4 off month one');
    expect(copy.referrer).toBe('£8 credit for you');
  });

  it('stores and clears overrides in D1', async () => {
    const db = makeSettingsDb();
    const stripePricing = buildPublicPricingFromPlans({}, 'Household Hub');

    const saved = await applyMarketingPricingSetting({}, db, stripePricing, {
      overrides: { monthlyLabel: '£8.99/month' }
    });
    expect(saved.status).toBe(200);
    expect(saved.body.hasOverrides).toBe(true);

    const cleared = await applyMarketingPricingSetting({}, db, stripePricing, { reset: true });
    expect(cleared.status).toBe(200);
    expect(cleared.body.hasOverrides).toBe(false);
  });

  it('uses marketing pricing setting key', () => {
    expect(MARKETING_PRICING_SETTING_KEY).toBe('marketing_pricing_display');
  });
});
