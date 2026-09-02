import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyLocalHubEnv } from '../../scripts/lib/load-local-hub-env.mjs';

/**
 * @param {string} [fromFile]
 */
export function defaultHubTfvarsPath(fromFile = fileURLToPath(import.meta.url)) {
  return join(dirname(fromFile), '../../terraform/environments/hub.tfvars');
}

/**
 * @param {unknown} key
 */
export function isStripeTestSecret(key) {
  const value = String(key ?? '').trim();
  return value.startsWith('sk_test_') || value.startsWith('rk_test_');
}

/**
 * @param {unknown} key
 */
export function isStripeLiveSecret(key) {
  const value = String(key ?? '').trim();
  return value.startsWith('sk_live_') || value.startsWith('rk_live_');
}

/**
 * @param {unknown} key
 */
export function stripeTestSecretProblem(key) {
  const value = String(key ?? '').trim();
  if (!value) {
    return 'STRIPE_SECRET_KEY is missing. Local runs load stripe_secret_key from terraform/environments/hub.tfvars; CI needs the GitHub secret.';
  }
  if (isStripeLiveSecret(value)) {
    return 'STRIPE_SECRET_KEY is a live key. The lifecycle test only runs against Stripe test mode.';
  }
  return 'STRIPE_SECRET_KEY must be a Stripe test key (sk_test_ / rk_test_).';
}

/**
 * Fill lifecycle env from hub.tfvars when exports are unset.
 * Does not override an explicit STRIPE_SECRET_KEY or E2E_OWNER_EMAIL.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @param {string} [hubTfvarsPath]
 */
export function loadLifecycleEnv(env = process.env, hubTfvarsPath = defaultHubTfvarsPath()) {
  applyLocalHubEnv(hubTfvarsPath, env);

  if (!env.E2E_OWNER_EMAIL?.trim()) {
    const fallback = firstCsvEmail(env.PLATFORM_OPERATOR_EMAILS) || firstCsvEmail(env.OWNER_EMAILS);
    if (fallback) env.E2E_OWNER_EMAIL = fallback;
  }

  if (!env.STRIPE_MODE?.trim()) {
    env.STRIPE_MODE = 'test';
  }

  return env;
}

/**
 * @param {string | undefined} csv
 */
function firstCsvEmail(csv) {
  return String(csv ?? '')
    .split(',')
    .map((part) => part.trim())
    .find(Boolean);
}
