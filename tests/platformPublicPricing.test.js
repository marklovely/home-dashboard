import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildPlanOptionFromStripePrice,
  buildPublicPricingFromPlans,
  computeAnnualSavings,
  formatBillingInterval,
  formatMinorCurrency,
  getPublicPlanPricing
} from '../functions/api/platform/platformPublicPricing.js';

vi.mock('../functions/api/platform/platformBilling.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    stripeApiRequest: vi.fn()
  };
});

import { stripeApiRequest } from '../functions/api/platform/platformBilling.js';

describe('platform public pricing', () => {
  beforeEach(() => {
    vi.mocked(stripeApiRequest).mockReset();
  });

  it('formats GBP minor units', () => {
    expect(formatMinorCurrency(999, 'gbp')).toBe('£9.99');
    expect(formatMinorCurrency(9900, 'gbp')).toBe('£99.00');
  });

  it('formats billing intervals', () => {
    expect(formatBillingInterval('month', 1)).toBe('month');
    expect(formatBillingInterval('year', 1)).toBe('year');
  });

  it('builds monthly and yearly plan options from Stripe payloads', () => {
    const month = buildPlanOptionFromStripePrice({
      currency: 'gbp',
      unit_amount: 999,
      recurring: { interval: 'month', interval_count: 1 },
      product: { name: 'Lovely Home Hub' }
    });
    const year = buildPlanOptionFromStripePrice({
      currency: 'gbp',
      unit_amount: 9900,
      recurring: { interval: 'year', interval_count: 1 },
      product: { name: 'Lovely Home Hub' }
    });

    expect(month.option.label).toBe('£9.99/month');
    expect(year.option.label).toBe('£99.00/year');
    expect(month.productName).toBe('Lovely Home Hub');
  });

  it('computes annual savings vs monthly', () => {
    const month = buildPlanOptionFromStripePrice({
      currency: 'gbp',
      unit_amount: 999,
      recurring: { interval: 'month', interval_count: 1 }
    }).option;
    const year = buildPlanOptionFromStripePrice({
      currency: 'gbp',
      unit_amount: 9900,
      recurring: { interval: 'year', interval_count: 1 }
    }).option;

    const savings = computeAnnualSavings(month, year);
    expect(savings?.savingsPercent).toBe(17);
    expect(savings?.savingsLabel).toContain('£20.88');
  });

  it('builds dual-plan marketing copy', () => {
    const month = buildPlanOptionFromStripePrice({
      currency: 'gbp',
      unit_amount: 999,
      recurring: { interval: 'month', interval_count: 1 }
    }).option;
    const year = buildPlanOptionFromStripePrice({
      currency: 'gbp',
      unit_amount: 9900,
      recurring: { interval: 'year', interval_count: 1 }
    }).option;

    const pricing = buildPublicPricingFromPlans({ month, year }, 'Household Hub');
    expect(pricing.monthlyLabel).toBe('£9.99/month');
    expect(pricing.yearlyLabel).toBe('£99.00/year');
    expect(pricing.checkoutSummary).toContain('£9.99/month');
    expect(pricing.checkoutSummary).toContain('£99.00/year');
    expect(pricing.signupSummary).toContain('choose');
  });

  it('returns unconfigured pricing when Stripe env is missing', async () => {
    const pricing = await getPublicPlanPricing({});
    expect(pricing.configured).toBe(false);
    expect(pricing.monthlyLabel).toBeNull();
    expect(pricing.trialDays).toBe(7);
  });

  it('fetches monthly and yearly Stripe prices when configured', async () => {
    vi.mocked(stripeApiRequest)
      .mockResolvedValueOnce({
        currency: 'gbp',
        unit_amount: 999,
        recurring: { interval: 'month', interval_count: 1 },
        product: { name: 'Household Hub' }
      })
      .mockResolvedValueOnce({
        currency: 'gbp',
        unit_amount: 9900,
        recurring: { interval: 'year', interval_count: 1 },
        product: { name: 'Household Hub' }
      });

    const pricing = await getPublicPlanPricing({
      STRIPE_SECRET_KEY: 'sk_test',
      STRIPE_PRICE_ID: 'price_month',
      STRIPE_PRICE_ID_YEARLY: 'price_year'
    });

    expect(stripeApiRequest).toHaveBeenCalledTimes(2);
    expect(pricing.monthlyLabel).toBe('£9.99/month');
    expect(pricing.yearlyLabel).toBe('£99.00/year');
    expect(pricing.annualSavingsPercent).toBe(17);
  });
});
