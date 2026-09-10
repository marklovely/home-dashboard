import { describe, expect, it } from 'vitest';
import {
  buildPublicHubPlanStatus,
  isZeroAmountStripePrice,
  planLimits,
  planTierFromBillingRow,
  resolvePlanTierFromPriceId,
  resolvePlanTierFromSubscription,
  stripeSubscriptionPriceId
} from '../functions/api/platform/platformPlanTier.js';

describe('platformPlanTier', () => {
  const env = {
    STRIPE_PRICE_ID_FREE: 'price_free_test',
    STRIPE_PRICE_ID: 'price_plus_month'
  };

  it('resolves free and plus from Stripe price ids', () => {
    expect(resolvePlanTierFromPriceId(env, 'test', 'price_free_test')).toBe('free');
    expect(resolvePlanTierFromPriceId(env, 'test', 'price_plus_month')).toBe('plus');
  });

  it('treats zero-amount prices as Free when the free price id env is missing', () => {
    expect(isZeroAmountStripePrice({ unit_amount: 0 })).toBe(true);
    expect(resolvePlanTierFromPriceId({}, 'test', 'price_unknown_free', { unit_amount: 0 })).toBe('free');
    expect(
      resolvePlanTierFromSubscription({}, 'test', {
        items: { data: [{ price: { id: 'price_unknown_free', unit_amount: 0 } }] }
      })
    ).toBe('free');
  });

  it('reads the first subscription item price id', () => {
    expect(
      stripeSubscriptionPriceId({
        items: { data: [{ price: { id: 'price_free_test' } }] }
      })
    ).toBe('price_free_test');
  });

  it('returns Free limits and unlimited Plus limits', () => {
    expect(planLimits('free')).toEqual({ maxGuides: 2, maxStays: 2 });
    expect(planLimits('plus')).toEqual({ maxGuides: null, maxStays: null });
  });

  it('builds a public hub plan payload', () => {
    const payload = buildPublicHubPlanStatus({
      plan_tier: 'free',
      status: 'active'
    });
    expect(payload.plan).toBe('free');
    expect(payload.planLabel).toBe('Free');
    expect(payload.limits.maxGuides).toBe(2);
    expect(payload.upgradeUrl).toContain('/pricing');
  });

  it('defaults missing plan_tier to plus', () => {
    expect(planTierFromBillingRow({ plan_tier: null, status: 'active' })).toBe('plus');
    expect(planTierFromBillingRow({ plan_tier: 'free', status: 'active' })).toBe('free');
  });
});
