import { describe, expect, it } from 'vitest';
import { escapeHcl } from '../scripts/lib/hub-tfvars.mjs';

describe('generate-hub-tfvars stripe passthrough', () => {
  it('escapes stripe values for HCL embedding', () => {
    expect(escapeHcl('sk_test_abc')).toBe('sk_test_abc');
    expect(escapeHcl('whsec_"test"')).toBe('whsec_\\"test\\"');
  });

  it('documents expected env to tfvars field mapping', () => {
    const mapping = {
      STRIPE_SECRET_KEY: 'stripe_secret_key',
      STRIPE_WEBHOOK_SECRET: 'stripe_webhook_secret',
      STRIPE_PRICE_ID: 'stripe_price_id',
      STRIPE_PRICE_ID_YEARLY: 'stripe_price_id_yearly',
      PLATFORM_CF_API_TOKEN: 'platform_cf_api_token',
      MARKETING_SITE_ORIGIN: 'marketing_site_origin',
      PUBLIC_SIGNUP_ENABLED: 'public_signup_enabled',
      RESEND_API_KEY: 'resend_api_key'
    };
    expect(Object.keys(mapping)).toHaveLength(8);
  });
});
