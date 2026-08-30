import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  handlePublicHubSignup,
  isPublicSignupSlugAvailable,
  publicSignupConfigured,
  publicSignupUrls,
  validatePublicSignupSiteId
} from '../functions/api/platform/platformPublicSignup.js';

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

import { dispatchSiteManageWorkflow } from '../functions/api/platform/platformGitHub.js';
import { createBillingCheckoutSession, getSiteBilling } from '../functions/api/platform/platformBilling.js';

const baseEnv = {
  PUBLIC_SIGNUP_ENABLED: 'true',
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_ID: 'price_test',
  PLATFORM_GITHUB_TOKEN: 'ghp_test',
  PLATFORM_GITHUB_REPO: 'owner/repo'
};

const emptyManifest = { sites: {}, platform: { customerZoneName: 'lovely-hub.com' } };

describe('platform public signup', () => {
  beforeEach(() => {
    vi.mocked(dispatchSiteManageWorkflow).mockReset();
    vi.mocked(createBillingCheckoutSession).mockReset();
    vi.mocked(getSiteBilling).mockReset();
  });

  it('requires PUBLIC_SIGNUP_ENABLED', () => {
    expect(publicSignupConfigured({ ...baseEnv, PUBLIC_SIGNUP_ENABLED: 'false' })).toBe(false);
    expect(publicSignupConfigured(baseEnv)).toBe(true);
  });

  it('blocks reserved slugs', () => {
    expect(validatePublicSignupSiteId('demo')).toMatch(/reserved/i);
    expect(validatePublicSignupSiteId('rose-cottage')).toBeNull();
  });

  it('checks slug availability against manifest', () => {
    const manifest = {
      sites: { smith: { siteId: 'smith', hostname: 'smith.lovely-hub.com' } }
    };
    expect(isPublicSignupSlugAvailable(manifest, 'smith').available).toBe(false);
    expect(isPublicSignupSlugAvailable(manifest, 'rose-cottage').available).toBe(true);
  });

  it('builds marketing success and cancel URLs', () => {
    const urls = publicSignupUrls(baseEnv, 'rose-cottage');
    expect(urls.successUrl).toBe('https://lovely-home.co.uk/signup-success.html?site=rose-cottage');
    expect(urls.cancelUrl).toContain('signup.html?canceled=1');
  });

  it('dispatches registry create and returns checkout URL', async () => {
    vi.mocked(dispatchSiteManageWorkflow).mockResolvedValue({
      ok: true,
      siteId: 'rose-cottage',
      workflow: 'platform-site-manage.yml',
      message: 'started'
    });
    vi.mocked(createBillingCheckoutSession).mockResolvedValue({
      ok: true,
      url: 'https://checkout.stripe.com/test',
      sessionId: 'cs_test'
    });
    vi.mocked(getSiteBilling).mockResolvedValue(null);

    const result = await handlePublicHubSignup(
      baseEnv,
      emptyManifest,
      'rose-cottage',
      'owner@example.com',
      /** @type {D1Database} */ ({})
    );

    expect(result.ok).toBe(true);
    expect(result.body.checkoutUrl).toBe('https://checkout.stripe.com/test');
    expect(dispatchSiteManageWorkflow).toHaveBeenCalledWith(
      baseEnv,
      'create',
      expect.objectContaining({
        siteId: 'rose-cottage',
        hostname: 'rose-cottage.lovely-hub.com',
        owner_emails: ['owner@example.com']
      })
    );
    expect(createBillingCheckoutSession).toHaveBeenCalledWith(
      baseEnv,
      expect.objectContaining({
        siteId: 'rose-cottage',
        customerEmail: 'owner@example.com',
        successUrl: expect.stringContaining('signup-success.html')
      })
    );
  });
});
