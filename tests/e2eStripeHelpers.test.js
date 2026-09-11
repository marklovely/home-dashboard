import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  encodeStripeFormEntries,
  findHubSubscription,
  priceIdFromCheckoutSession,
  uniqueOwnerEmail
} from '../e2e/lib/stripeApi.js';
import { checkoutHasFinished, isStripeHostedCheckoutUrl, parseCheckoutSessionId } from '../e2e/lib/stripeCheckout.js';
import {
  isStripeLiveSecret,
  isStripeTestSecret,
  loadLifecycleEnv,
  stripeTestSecretProblem
} from '../e2e/lib/loadLifecycleEnv.js';

describe('lifecycle e2e helpers', () => {
  it('plus-tags the owner email with the site id', () => {
    expect(uniqueOwnerEmail('you@example.com', 'e2e-abc')).toBe('you+e2e-abc@example.com');
    expect(uniqueOwnerEmail('you+ops@example.com', 'e2e-abc')).toBe('you+ops-e2e-abc@example.com');
  });

  it('accepts only Stripe test secrets', () => {
    expect(isStripeTestSecret('sk_test_abc')).toBe(true);
    expect(isStripeTestSecret('rk_test_abc')).toBe(true);
    expect(isStripeTestSecret('sk_live_abc')).toBe(false);
    expect(isStripeLiveSecret('sk_live_abc')).toBe(true);
    expect(stripeTestSecretProblem('')).toMatch(/missing/i);
    expect(stripeTestSecretProblem('sk_live_abc')).toMatch(/live key/i);
  });

  it('loads the test Stripe key and operator email from hub.tfvars', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lifecycle-env-'));
    const path = join(dir, 'hub.tfvars');
    writeFileSync(
      path,
      `
stripe_secret_key = "sk_test_from_file"
platform_operator_emails = [
  "ops@example.com",
]
owner_emails = [
  "owner@example.com",
]
`
    );

    /** @type {NodeJS.ProcessEnv} */
    const env = {};
    loadLifecycleEnv(env, path);
    expect(env.STRIPE_SECRET_KEY).toBe('sk_test_from_file');
    expect(env.E2E_OWNER_EMAIL).toBe('ops@example.com');
    expect(env.STRIPE_MODE).toBe('test');
    expect(isStripeTestSecret(env.STRIPE_SECRET_KEY)).toBe(true);
  });

  it('does not override an explicit owner email or Stripe key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lifecycle-env-'));
    const path = join(dir, 'hub.tfvars');
    writeFileSync(
      path,
      `
stripe_secret_key = "sk_test_from_file"
platform_operator_emails = ["ops@example.com"]
`
    );

    /** @type {NodeJS.ProcessEnv} */
    const env = {
      STRIPE_SECRET_KEY: 'sk_test_explicit',
      E2E_OWNER_EMAIL: 'e2e@example.com'
    };
    loadLifecycleEnv(env, path);
    expect(env.STRIPE_SECRET_KEY).toBe('sk_test_explicit');
    expect(env.E2E_OWNER_EMAIL).toBe('e2e@example.com');
  });

  it('treats Stripe hosted checkout as unfinished until we leave it', () => {
    expect(isStripeHostedCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_abc')).toBe(true);
    expect(isStripeHostedCheckoutUrl('https://checkout.link.com/c/pay/cs_test_abc')).toBe(true);
    expect(checkoutHasFinished('https://checkout.stripe.com/c/pay/cs_test_abc')).toBe(false);
    expect(checkoutHasFinished('https://lovely-home.co.uk/signup-success?site=e2e-abc')).toBe(true);
    expect(checkoutHasFinished('https://lovely-home.cloudflareaccess.com/cdn-cgi/access/login')).toBe(true);
    expect(parseCheckoutSessionId('https://checkout.stripe.com/c/pay/cs_test_abcDEF123')).toBe('cs_test_abcDEF123');
    expect(parseCheckoutSessionId('https://lovely-home.co.uk/signup')).toBe('');
  });

  it('findHubSubscription searches trialing and active subscriptions by site metadata', async () => {
    /** @type {Record<string, string>} */
    const calls = {};
    const fetchImpl = async (/** @type {string | URL} */ url) => {
      const href = String(url);
      if (href.includes('/customers?')) {
        return new Response(JSON.stringify({ data: [{ id: 'cus_1' }] }), { status: 200 });
      }
      if (href.includes('/subscriptions?') && href.includes('status=trialing')) {
        calls.trialing = href;
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      if (href.includes('/subscriptions?') && href.includes('status=active')) {
        calls.active = href;
        return new Response(
          JSON.stringify({ data: [{ id: 'sub_free', metadata: { site_id: 'e2e-abc' } }] }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const match = await findHubSubscription('sk_test_abc', 'owner@example.com', 'e2e-abc');
      expect(match?.id).toBe('sub_free');
      expect(calls.trialing).toContain('status=trialing');
      expect(calls.active).toContain('status=active');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('encodes nested Stripe form fields and reads a Checkout price id', () => {
    expect(encodeStripeFormEntries({ items: [{ price: 'price_123' }], metadata: { site_id: 'e2e-abc' } })).toEqual([
      ['items[0][price]', 'price_123'],
      ['metadata[site_id]', 'e2e-abc']
    ]);
    expect(priceIdFromCheckoutSession({ line_items: { data: [{ price: { id: 'price_from_session' } }] } })).toBe(
      'price_from_session'
    );
    expect(priceIdFromCheckoutSession({ line_items: { data: [{ price: 'price_string' }] } })).toBe('price_string');
    expect(priceIdFromCheckoutSession({})).toBe('');
  });
});
