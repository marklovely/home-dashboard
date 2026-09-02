import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { uniqueOwnerEmail } from '../e2e/lib/stripeApi.js';
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
});
