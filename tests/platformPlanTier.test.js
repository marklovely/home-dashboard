import { describe, expect, it } from 'vitest';
import {
  accountDowngradeUrl,
  accountUpgradeUrl,
  buildPublicHubPlanStatus,
  isZeroAmountStripePrice,
  planLimitState,
  planFeatureEnabled,
  planFeatures,
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
    expect(planLimits('free')).toEqual({
      maxGuides: 2,
      maxStays: 2,
      features: { bins: false, smartHome: false, weather: true }
    });
    expect(planLimits('plus')).toEqual({
      maxGuides: null,
      maxStays: null,
      features: { bins: true, smartHome: true, weather: true }
    });
  });

  it('gates bins and smart home on Free while keeping weather', () => {
    expect(planFeatures('free')).toEqual({ bins: false, smartHome: false, weather: true });
    expect(planFeatureEnabled('free', 'weather')).toBe(true);
    expect(planFeatureEnabled('free', 'bins')).toBe(false);
    expect(planFeatureEnabled('plus', 'smartHome')).toBe(true);
  });

  it('tracks soft-limit state for guide templates and stays', () => {
    expect(planLimitState('free', { guides: 1, stays: 2 })).toEqual({
      atGuideLimit: false,
      atStayLimit: true,
      overGuideLimit: false,
      overStayLimit: false
    });
    expect(planLimitState('free', { guides: 4, stays: 1 })).toEqual({
      atGuideLimit: true,
      atStayLimit: false,
      overGuideLimit: true,
      overStayLimit: false
    });
    expect(planLimitState('plus', { guides: 99, stays: 99 }).atGuideLimit).toBe(false);
  });

  it('builds a public hub plan payload', () => {
    const env = { MARKETING_SITE_ORIGIN: 'https://lovely-home.co.uk' };
    const payload = buildPublicHubPlanStatus(
      {
        plan_tier: 'free',
        status: 'active'
      },
      Date.now(),
      { env, siteId: 'test-cottage-free' }
    );
    expect(payload.plan).toBe('free');
    expect(payload.planLabel).toBe('Free');
    expect(payload.limits.maxGuides).toBe(2);
    expect(payload.limits.features).toEqual({ bins: false, smartHome: false, weather: true });
    expect(payload.guidesExplainer).toContain('guide templates');
    expect(payload.upgradeUrl).toBe('https://lovely-home.co.uk/account?upgrade=test-cottage-free');
    expect(accountUpgradeUrl(env, 'test-cottage-free')).toBe(
      'https://lovely-home.co.uk/account?upgrade=test-cottage-free'
    );
  });

  it('points Plus hubs at the account page instead of pricing', () => {
    const payload = buildPublicHubPlanStatus(
      { plan_tier: 'plus', status: 'active' },
      Date.now(),
      { env: { MARKETING_SITE_ORIGIN: 'https://lovely-home.co.uk' }, siteId: 'kitchen-home' }
    );
    expect(payload.upgradeUrl).toBe('https://lovely-home.co.uk/account');
    expect(payload.downgradeUrl).toBe('https://lovely-home.co.uk/account?downgrade=kitchen-home');
    expect(accountDowngradeUrl({ MARKETING_SITE_ORIGIN: 'https://lovely-home.co.uk' }, 'kitchen-home')).toBe(
      'https://lovely-home.co.uk/account?downgrade=kitchen-home'
    );
    expect(payload.guidesExplainer).toBeNull();
  });

  it('defaults missing plan_tier to plus', () => {
    expect(planTierFromBillingRow({ plan_tier: null, status: 'active' })).toBe('plus');
    expect(planTierFromBillingRow({ plan_tier: 'free', status: 'active' })).toBe('free');
  });
});
