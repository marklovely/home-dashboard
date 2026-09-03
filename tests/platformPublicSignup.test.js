import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  checkPublicSignupSlug,
  handlePublicHubSignup,
  isPublicSignupSlugAvailable,
  publicSignupConfigured,
  publicSignupUrls,
  validatePublicSignupSiteId
} from '../functions/api/platform/platformPublicSignup.js';
import { resolveStripePriceId } from '../functions/api/platform/platformBilling.js';

vi.mock('../functions/api/platform/platformGitHub.js', () => ({
  dispatchSiteManageWorkflow: vi.fn(),
  githubAutomationConfigured: vi.fn(() => true)
}));

vi.mock('../functions/api/platform/platformBilling.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createBillingCheckoutSession: vi.fn(),
    stripeBillingConfigured: vi.fn(() => true),
    getSiteBilling: vi.fn()
  };
});

vi.mock('../functions/api/platform/platformSignupGuards.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    consumeSignupAttempt: vi.fn(async () => ({ allowed: true, retryAfterSec: 0, attempts: 1 })),
    getActiveSignupReservation: vi.fn(async () => null),
    pruneExpiredSignupData: vi.fn(async () => {}),
    releaseSignupReservation: vi.fn(async () => {}),
    reserveSignupSlug: vi.fn(async () => ({ ok: true, reserved: true, expiresAt: 1_700_000_000 }))
  };
});

import { dispatchSiteManageWorkflow } from '../functions/api/platform/platformGitHub.js';
import { createBillingCheckoutSession, getSiteBilling } from '../functions/api/platform/platformBilling.js';
import {
  consumeSignupAttempt,
  getActiveSignupReservation,
  releaseSignupReservation,
  reserveSignupSlug
} from '../functions/api/platform/platformSignupGuards.js';

const baseEnv = {
  PUBLIC_SIGNUP_ENABLED: 'true',
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_ID: 'price_month',
  STRIPE_PRICE_ID_YEARLY: 'price_year',
  PLATFORM_GITHUB_TOKEN: 'ghp_test',
  PLATFORM_GITHUB_REPO: 'owner/repo'
};

const emptyManifest = { sites: {}, platform: { customerZoneName: 'lovely-hub.com' } };
const billingDb = /** @type {D1Database} */ ({});

/**
 * @param {Partial<Parameters<typeof handlePublicHubSignup>[1]>} [overrides]
 */
function signupInput(overrides = {}) {
  return {
    manifest: emptyManifest,
    siteId: 'rose-cottage',
    customerEmail: 'owner@example.com',
    billingDb,
    clientIp: '203.0.113.10',
    ...overrides
  };
}

describe('platform public signup', () => {
  beforeEach(() => {
    vi.mocked(dispatchSiteManageWorkflow).mockReset();
    vi.mocked(createBillingCheckoutSession).mockReset();
    vi.mocked(getSiteBilling).mockReset();
    vi.mocked(getSiteBilling).mockResolvedValue(null);
    vi.mocked(getActiveSignupReservation).mockReset();
    vi.mocked(getActiveSignupReservation).mockResolvedValue(null);
    vi.mocked(consumeSignupAttempt).mockReset();
    vi.mocked(consumeSignupAttempt).mockResolvedValue({ allowed: true, retryAfterSec: 0, attempts: 1 });
    vi.mocked(reserveSignupSlug).mockReset();
    vi.mocked(reserveSignupSlug).mockResolvedValue({ ok: true, reserved: true, expiresAt: 1_700_000_000 });
    vi.mocked(releaseSignupReservation).mockReset();
    vi.mocked(releaseSignupReservation).mockResolvedValue(undefined);
  });

  it('requires PUBLIC_SIGNUP_ENABLED', () => {
    expect(publicSignupConfigured({ ...baseEnv, PUBLIC_SIGNUP_ENABLED: 'false' })).toBe(false);
    expect(publicSignupConfigured(baseEnv)).toBe(true);
  });

  it('blocks reserved slugs', () => {
    expect(validatePublicSignupSiteId('demo')).toMatch(/reserved/i);
    expect(validatePublicSignupSiteId('e2e')).toMatch(/reserved/i);
    expect(validatePublicSignupSiteId('e2e-abc12')).toBeNull();
    expect(validatePublicSignupSiteId('rose-cottage')).toBeNull();
    expect(validatePublicSignupSiteId('kitchen_home')).toMatch(/hyphens/i);
  });

  it('checks slug availability against manifest', () => {
    const manifest = {
      sites: { smith: { siteId: 'smith', hostname: 'smith.lovely-hub.com' } }
    };
    expect(isPublicSignupSlugAvailable(manifest, 'smith').available).toBe(false);
    expect(isPublicSignupSlugAvailable(manifest, 'rose-cottage').available).toBe(true);
  });

  it('treats a live reservation as unavailable', async () => {
    vi.mocked(getActiveSignupReservation).mockResolvedValue({ site_id: 'rose-cottage' });
    const result = await checkPublicSignupSlug(emptyManifest, 'rose-cottage', billingDb);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/being set up/i);
  });

  it('blocks a hub name held after cancel', async () => {
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'rose-cottage',
      slug_held_until: Date.now() + 60_000
    });
    const result = await checkPublicSignupSlug(emptyManifest, 'rose-cottage', billingDb);
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/hub name/i);
    expect(result.reason).toContain('rose-cottage.lovely-hub.com');
  });

  it('lets the original owner reclaim a held hub name at checkout', async () => {
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'smith',
      owner_email: 'owner@example.com',
      slug_held_until: Date.now() + 60_000
    });
    const result = await checkPublicSignupSlug(emptyManifest, 'smith', billingDb, {
      ownerEmail: 'owner@example.com'
    });
    expect(result.available).toBe(true);
  });

  it('skips hold checks on live slug lookup before email is entered', async () => {
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'smith',
      slug_held_until: Date.now() + 60_000
    });
    const result = await checkPublicSignupSlug(emptyManifest, 'smith', billingDb, {
      skipHold: true
    });
    expect(result.available).toBe(true);
  });

  it('builds marketing success and cancel URLs', () => {
    const urls = publicSignupUrls(baseEnv, 'rose-cottage');
    expect(urls.successUrl).toBe('https://lovely-home.co.uk/signup-success.html?site=rose-cottage');
    expect(urls.cancelUrl).toContain('signup.html?canceled=1');

    const returning = publicSignupUrls(baseEnv, 'smith', { returning: true });
    expect(returning.successUrl).toBe(
      'https://lovely-home.co.uk/signup-success.html?site=smith&returning=1'
    );
  });

  it('returns a checkout URL without touching the registry', async () => {
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: true,
      url: 'https://checkout.stripe.com/test',
      sessionId: 'cs_test'
    });

    const result = await handlePublicHubSignup(baseEnv, signupInput());

    expect(result.ok).toBe(true);
    expect(result.body.checkoutUrl).toBe('https://checkout.stripe.com/test');
    // Infrastructure must never be triggered before Stripe confirms payment.
    expect(dispatchSiteManageWorkflow).not.toHaveBeenCalled();
    expect(createBillingCheckoutSession).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({
        siteId: 'rose-cottage',
        customerEmail: 'owner@example.com',
        billingInterval: 'month',
        successUrl: expect.stringContaining('signup-success.html')
      })
    );
  });

  it('adds returning=1 to the success URL when the original owner reclaims a held hub', async () => {
    vi.mocked(getSiteBilling).mockResolvedValue({
      site_id: 'smith',
      status: 'canceled',
      owner_email: 'owner@example.com',
      slug_held_until: Date.now() + 60_000
    });
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: true,
      url: 'https://checkout.stripe.com/test',
      sessionId: 'cs_test'
    });

    const result = await handlePublicHubSignup(baseEnv, signupInput({ siteId: 'smith' }));

    expect(result.ok).toBe(true);
    expect(createBillingCheckoutSession).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({
        siteId: 'smith',
        successUrl: 'https://lovely-home.co.uk/signup-success.html?site=smith&returning=1'
      })
    );
  });

  it('reserves the slug before Stripe Checkout starts', async () => {
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: true,
      url: 'https://checkout.stripe.com/test',
      sessionId: 'cs_test'
    });

    await handlePublicHubSignup(baseEnv, signupInput());

    expect(reserveSignupSlug).toHaveBeenNthCalledWith(
      1,
      billingDb,
      expect.objectContaining({
        siteId: 'rose-cottage',
        ownerEmail: 'owner@example.com',
        sessionId: null
      })
    );
    expect(createBillingCheckoutSession).toHaveBeenCalled();
    expect(reserveSignupSlug.mock.invocationCallOrder[0]).toBeLessThan(
      createBillingCheckoutSession.mock.invocationCallOrder[0]
    );
    expect(reserveSignupSlug).toHaveBeenNthCalledWith(
      2,
      billingDb,
      expect.objectContaining({ sessionId: 'cs_test' })
    );
  });

  it('releases the reservation when checkout fails', async () => {
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: false,
      error: 'STRIPE_CHECKOUT_FAILED',
      message: 'nope'
    });

    const result = await handlePublicHubSignup(baseEnv, signupInput());

    expect(result.status).toBe(503);
    expect(reserveSignupSlug).toHaveBeenCalled();
    expect(releaseSignupReservation).toHaveBeenCalledWith(billingDb, 'rose-cottage');
  });

  it('does not start checkout when another owner already holds the slug', async () => {
    vi.mocked(reserveSignupSlug).mockResolvedValue({ ok: true, reserved: false, expiresAt: null });

    const result = await handlePublicHubSignup(baseEnv, signupInput());

    expect(result.status).toBe(409);
    expect(result.body.error).toBe('SLUG_UNAVAILABLE');
    expect(createBillingCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects throttled clients before creating a checkout session', async () => {
    vi.mocked(consumeSignupAttempt).mockResolvedValue({
      allowed: false,
      retryAfterSec: 900,
      attempts: 6
    });

    const result = await handlePublicHubSignup(baseEnv, signupInput());

    expect(result.status).toBe(429);
    expect(result.retryAfterSec).toBe(900);
    expect(createBillingCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects an invalid site id before any billing work', async () => {
    const result = await handlePublicHubSignup(baseEnv, signupInput({ siteId: 'Demo Hub' }));
    expect(result.status).toBe(400);
    expect(consumeSignupAttempt).not.toHaveBeenCalled();
  });

  it('requires a Turnstile token once keys are configured', async () => {
    const env = { ...baseEnv, TURNSTILE_SITE_KEY: '1x0000', TURNSTILE_SECRET_KEY: '2x0000' };
    const result = await handlePublicHubSignup(env, signupInput({ turnstileToken: '' }));

    expect(result.status).toBe(403);
    expect(result.body.error).toBe('CHALLENGE_FAILED');
    expect(createBillingCheckoutSession).not.toHaveBeenCalled();
  });

  it('accepts a verified Turnstile token', async () => {
    const env = { ...baseEnv, TURNSTILE_SITE_KEY: '1x0000', TURNSTILE_SECRET_KEY: '2x0000' };
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: true,
      url: 'https://checkout.stripe.com/test',
      sessionId: 'cs_test'
    });
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ success: true })));

    const result = await handlePublicHubSignup(
      env,
      signupInput({ turnstileToken: 'token', fetchImpl })
    );

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('rejects a site that already has an active subscription', async () => {
    vi.mocked(getSiteBilling).mockResolvedValue({ site_id: 'rose-cottage', status: 'active' });

    const result = await handlePublicHubSignup(baseEnv, signupInput());

    expect(result.status).toBe(409);
    expect(result.body.error).toBe('BILLING_ALREADY_ACTIVE');
  });

  it('passes yearly billing interval to checkout', async () => {
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: true,
      url: 'https://checkout.stripe.com/test-year',
      sessionId: 'cs_test_year'
    });

    await handlePublicHubSignup(baseEnv, signupInput({ billingInterval: 'year' }));

    expect(createBillingCheckoutSession).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({ billingInterval: 'year' })
    );
  });

  it('refuses lifecycle slugs while Stripe is live', async () => {
    const liveDb = {
      prepare() {
        return {
          bind() {
            return this;
          },
          async first() {
            return { value: 'live' };
          }
        };
      }
    };
    const result = await handlePublicHubSignup(
      baseEnv,
      signupInput({ siteId: 'e2e-abc12', billingDb: /** @type {D1Database} */ (liveDb) })
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.body.error).toBe('E2E_NOT_ALLOWED');
    expect(createBillingCheckoutSession).not.toHaveBeenCalled();
  });

  it('resolves monthly and yearly Stripe price ids', () => {
    expect(resolveStripePriceId(baseEnv, 'month')).toBe('price_month');
    expect(resolveStripePriceId(baseEnv, 'year')).toBe('price_year');
    expect(resolveStripePriceId(baseEnv, 'yearly')).toBe('price_year');
  });
});
