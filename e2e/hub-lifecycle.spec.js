import { expect, test } from '@playwright/test';
import {
  cancelSubscriptionNow,
  findTrialingSubscription,
  uniqueOwnerEmail
} from './lib/stripeApi.js';
import { checkoutHasFinished } from './lib/stripeCheckout.js';
import { isStripeTestSecret, stripeTestSecretProblem } from './lib/loadLifecycleEnv.js';

const PLATFORM_API_ORIGIN = (process.env.PLATFORM_API_ORIGIN || 'https://platform.lovely-home.co.uk').replace(
  /\/$/,
  ''
);
const PROVISION_TIMEOUT_MS = 40 * 60 * 1000;
const TEARDOWN_TIMEOUT_MS = 40 * 60 * 1000;

test.describe.configure({ mode: 'serial' });

test('signup, wait for hub, cancel trial, confirm teardown', async ({ page }) => {
  assertTestModeOnly();
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
  const ownerEmailBase = process.env.E2E_OWNER_EMAIL?.trim() || '';
  if (!ownerEmailBase) {
    throw new Error('Set E2E_OWNER_EMAIL to an inbox you control (plus-addressing is used).');
  }

  const siteId = `e2e-${randomSlug()}`;
  const ownerEmail = uniqueOwnerEmail(ownerEmailBase, siteId);
  test.info().annotations.push({ type: 'siteId', description: siteId });
  test.info().annotations.push({ type: 'ownerEmail', description: ownerEmail });

  const checkoutUrl = await startSignupCheckout(siteId, ownerEmail);
  await page.goto(checkoutUrl);
  await completeStripeTestCheckout(page);
  await page.waitForURL((url) => checkoutHasFinished(url), {
    timeout: 120_000,
    waitUntil: 'domcontentloaded'
  });

  const live = await waitForHubStatus(siteId, PROVISION_TIMEOUT_MS, (status) => {
    if (status.state === 'failed') {
      throw new Error(`Provisioning failed for ${siteId}: ${status.message ?? 'unknown'}`);
    }
    return status.ready === true && status.looksLikeHub === true;
  });
  expect(live.ready).toBe(true);
  expect(live.looksLikeHub).toBe(true);

  const subscription = await waitForSubscription(secretKey, ownerEmail, siteId);
  expect(subscription?.id).toMatch(/^sub_/);
  await cancelSubscriptionNow(secretKey, subscription.id);

  const gone = await waitForHubStatus(siteId, TEARDOWN_TIMEOUT_MS, (status) => {
    return status.ready !== true && status.registered !== true && status.looksLikeHub !== true;
  });
  expect(gone.ready).toBe(false);
  expect(gone.registered).toBe(false);
  expect(gone.looksLikeHub).toBe(false);
});

function assertTestModeOnly() {
  const mode = String(process.env.STRIPE_MODE ?? 'test').trim().toLowerCase();
  if (mode === 'live') {
    throw new Error('Refusing to run the hub lifecycle test while GitHub STRIPE_MODE is live.');
  }
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
  if (!isStripeTestSecret(secretKey)) {
    throw new Error(stripeTestSecretProblem(secretKey));
  }
}

function randomSlug() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * @param {string} siteId
 * @param {string} customerEmail
 */
async function startSignupCheckout(siteId, customerEmail) {
  const response = await fetch(`${PLATFORM_API_ORIGIN}/api/public/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      siteId,
      customerEmail,
      billingInterval: 'month'
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? `Signup failed (${response.status}): ${payload.error ?? 'unknown'}`);
  }
  const checkoutUrl = String(payload.checkoutUrl ?? payload.url ?? '').trim();
  if (!checkoutUrl) {
    throw new Error('Signup did not return a Stripe Checkout URL.');
  }
  return checkoutUrl;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function completeStripeTestCheckout(page) {
  const cardNumber = page.getByRole('textbox', { name: /card number/i });
  await cardNumber.waitFor({ timeout: 60_000 });
  await typeStripeField(cardNumber, '4242424242424242');
  await typeStripeField(page.getByRole('textbox', { name: /expiration/i }), '1234');
  await typeStripeField(page.getByRole('textbox', { name: /cvc/i }), '123');

  const name = page.getByRole('textbox', { name: /cardholder name|full name/i });
  if (await name.count()) {
    await name.fill('Lifecycle Test');
  }
  const postcode = page.getByRole('textbox', { name: /postal code|postcode/i });
  if (await postcode.count()) {
    await postcode.fill('SW1A 1AA');
  }

  const startTrial = page.getByRole('button', { name: /^start trial$/i });
  await startTrial.waitFor({ state: 'visible', timeout: 30_000 });
  await startTrial.click();
}

/**
 * Stripe hosted Checkout often ignores a single `.fill()` — type so its listeners fire.
 *
 * @param {import('@playwright/test').Locator} locator
 * @param {string} value
 */
async function typeStripeField(locator, value) {
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 25 });
}

/**
 * @param {string} siteId
 * @param {number} timeoutMs
 * @param {(status: Record<string, unknown>) => boolean} isDone
 */
async function waitForHubStatus(siteId, timeoutMs, isDone) {
  const started = Date.now();
  /** @type {Record<string, unknown>} */
  let last = {};
  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${PLATFORM_API_ORIGIN}/api/public/hub-status/${encodeURIComponent(siteId)}`, {
      headers: { Accept: 'application/json' }
    });
    last = await response.json().catch(() => ({}));
    if (isDone(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  throw new Error(
    `Timed out waiting for hub ${siteId}. Last status: ${JSON.stringify({
      state: last.state,
      ready: last.ready,
      registered: last.registered,
      looksLikeHub: last.looksLikeHub,
      message: last.message
    })}`
  );
}

/**
 * @param {string} secretKey
 * @param {string} email
 * @param {string} siteId
 */
async function waitForSubscription(secretKey, email, siteId) {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const subscription = await findTrialingSubscription(secretKey, email, siteId);
    if (subscription?.id) return subscription;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`Could not find a trialing Stripe subscription for ${siteId} (${email}).`);
}
