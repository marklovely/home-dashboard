import { describe, expect, it, vi } from 'vitest';
import {
  GO_LIVE_CONFIRMATION,
  SWITCH_TO_TEST_CONFIRMATION,
  applyStripeMode,
  describeStripeMode,
  normalizeStripeMode,
  stripeCredentialsForMode,
  stripeKeyPrefix,
  stripeModeConfirmationValid,
  stripeSetConfigured
} from '../functions/api/platform/platformStripeMode.js';
import { resolveStripePriceId, stripeBillingConfigured } from '../functions/api/platform/platformBilling.js';

const testEnv = {
  STRIPE_SECRET_KEY: 'sk_test_aaa',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_ID: 'price_test_month',
  STRIPE_SECRET_KEY_LIVE: 'sk_live_bbb',
  STRIPE_WEBHOOK_SECRET_LIVE: 'whsec_live',
  STRIPE_PRICE_ID_LIVE: 'price_live_month'
};

/**
 * @param {{ mode?: string, openCount?: number }} [options]
 */
function fakeSettingsDb(options = {}) {
  let stored = options.mode ?? 'test';
  const openCount = options.openCount ?? 0;
  return {
    prepare(sql) {
      /** @type {unknown[]} */
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async first() {
          if (sql.includes('FROM platform_settings')) {
            return { value: stored };
          }
          if (sql.includes('COUNT(*)')) {
            return { n: openCount };
          }
          return null;
        },
        async run() {
          if (sql.includes('INSERT INTO platform_settings')) {
            stored = String(bound[1]);
          }
          return { success: true };
        }
      };
    }
  };
}

describe('Stripe mode helpers', () => {
  it('treats anything other than live as test', () => {
    expect(normalizeStripeMode('live')).toBe('live');
    expect(normalizeStripeMode('LIVE')).toBe('live');
    expect(normalizeStripeMode('test')).toBe('test');
    expect(normalizeStripeMode('')).toBe('test');
  });

  it('selects the test or live credential set', () => {
    expect(stripeCredentialsForMode(testEnv, 'test').secretKey).toBe('sk_test_aaa');
    expect(stripeCredentialsForMode(testEnv, 'live').secretKey).toBe('sk_live_bbb');
    expect(stripeSetConfigured(stripeCredentialsForMode(testEnv, 'test'))).toBe(true);
    expect(stripeSetConfigured(stripeCredentialsForMode({ STRIPE_SECRET_KEY: 'sk_test' }, 'test'))).toBe(false);
    expect(resolveStripePriceId(testEnv, 'month')).toBe('price_test_month');
    expect(resolveStripePriceId(testEnv, 'month', 'live')).toBe('price_live_month');
    expect(stripeBillingConfigured(testEnv, 'live')).toBe(true);
  });

  it('reports the key prefix without exposing the secret', () => {
    expect(stripeKeyPrefix(stripeCredentialsForMode(testEnv, 'test'))).toBe('sk_test');
    expect(stripeKeyPrefix(stripeCredentialsForMode(testEnv, 'live'))).toBe('sk_live');
    expect(stripeKeyPrefix({ secretKey: '', webhookSecret: '', priceId: '', priceIdYearly: '' })).toBe('');
  });

  it('requires a typed confirmation to switch modes', () => {
    expect(stripeModeConfirmationValid(GO_LIVE_CONFIRMATION, 'live')).toBe(true);
    expect(stripeModeConfirmationValid('go live', 'live')).toBe(true);
    expect(stripeModeConfirmationValid('yes', 'live')).toBe(false);
    expect(stripeModeConfirmationValid(SWITCH_TO_TEST_CONFIRMATION, 'test')).toBe(true);
    expect(stripeModeConfirmationValid('GO LIVE', 'test')).toBe(false);
  });

  it('describes the active mode without exposing secrets', async () => {
    const status = await describeStripeMode(
      testEnv,
      /** @type {D1Database} */ (fakeSettingsDb({ mode: 'test', openCount: 2 }))
    );
    expect(status.mode).toBe('test');
    expect(status.stripeBillingConfigured).toBe(true);
    expect(status.liveConfigured).toBe(true);
    expect(status.keyPrefix).toBe('sk_test');
    expect(status.openSubscriptions).toBe(2);
    expect(JSON.stringify(status)).not.toContain('sk_test_aaa');
  });

  it('blocks go-live without GO LIVE and without live keys', async () => {
    const db = /** @type {D1Database} */ (fakeSettingsDb());
    const missingConfirm = await applyStripeMode(
      testEnv,
      db,
      { mode: 'live', confirmation: 'yes' },
      { setGithubActionsVariable: vi.fn() }
    );
    expect(missingConfirm.status).toBe(400);
    expect(missingConfirm.body.error).toBe('CONFIRMATION_REQUIRED');

    const missingKeys = await applyStripeMode(
      { STRIPE_SECRET_KEY: 'sk_test_aaa', STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_PRICE_ID: 'price_test' },
      db,
      { mode: 'live', confirmation: GO_LIVE_CONFIRMATION },
      { setGithubActionsVariable: vi.fn() }
    );
    expect(missingKeys.status).toBe(400);
    expect(missingKeys.body.error).toBe('KEYS_MISSING');
  });

  it('requires an acknowledgement when open subscriptions exist, then writes D1 and GitHub', async () => {
    const db = /** @type {D1Database} */ (fakeSettingsDb({ openCount: 1 }));
    const setGithub = vi.fn(async () => ({ ok: true, name: 'STRIPE_MODE' }));
    const blocked = await applyStripeMode(
      testEnv,
      db,
      { mode: 'live', confirmation: GO_LIVE_CONFIRMATION },
      { setGithubActionsVariable: setGithub }
    );
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toBe('OPEN_SUBSCRIPTIONS');
    expect(setGithub).not.toHaveBeenCalled();

    const switched = await applyStripeMode(
      testEnv,
      db,
      { mode: 'live', confirmation: 'go live', acknowledgeOpenSubscriptions: true },
      { setGithubActionsVariable: setGithub }
    );
    expect(switched.status).toBe(200);
    expect(switched.body.mode).toBe('live');
    expect(switched.body.keyPrefix).toBe('sk_live');
    expect(switched.body.githubUpdated).toBe(true);
    expect(setGithub).toHaveBeenCalledWith(testEnv, 'STRIPE_MODE', 'live');
  });
});
