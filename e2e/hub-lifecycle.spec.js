import { expect, test } from '@playwright/test';
import {
  cancelSubscriptionNow,
  findHubSubscription,
  startTestSubscriptionFromCheckoutSession,
  uniqueOwnerEmail,
  waitForCheckoutSessionComplete
} from './lib/stripeApi.js';
import { parseCheckoutSessionId } from './lib/stripeCheckout.js';
import { tryCompleteStripeHostedCheckout } from './lib/stripeHostedCheckout.js';
import { isStripeTestSecret, stripeTestSecretProblem } from './lib/loadLifecycleEnv.js';

const PLATFORM_API_ORIGIN = (process.env.PLATFORM_API_ORIGIN || 'https://platform.lovely-home.co.uk').replace(
  /\/$/,
  ''
);
const PROVISION_TIMEOUT_MS = 40 * 60 * 1000;
const TEARDOWN_TIMEOUT_MS = 40 * 60 * 1000;

test.describe.configure({ mode: 'serial' });

test('free signup, wait for hub, cancel subscription, confirm teardown', async () => {
  test.skip(
    String(process.env.E2E_SIGNUP_PLAN ?? 'free').trim().toLowerCase() === 'plus',
    'Skipped when E2E_SIGNUP_PLAN=plus — running Lovely Home+ checkout only.'
  );
  await runLifecycleTest({ plan: 'free' });
});

test('plus signup via checkout, wait for hub, cancel subscription, confirm teardown', async ({ page }) => {
  test.skip(
    String(process.env.E2E_SIGNUP_PLAN ?? 'free').trim().toLowerCase() !== 'plus',
    'Set E2E_SIGNUP_PLAN=plus to run the Lovely Home+ checkout lifecycle.'
  );
  await runLifecycleTest({ plan: 'plus', page });
});

/**
 * @param {{ plan: 'free' | 'plus'; page?: import('@playwright/test').Page }} options
 */
async function runLifecycleTest({ plan, page }) {
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
  test.info().annotations.push({ type: 'plan', description: plan });

  if (plan === 'free') {
    const signup = await startSignup(siteId, ownerEmail, 'free');
    expect(signup.plan).toBe('free');
    expect(signup.successUrl).toContain(`site=${siteId}`);
    expect(signup.checkoutUrl).toBeUndefined();
  } else {
    if (!page) {
      throw new Error('Plus lifecycle requires a Playwright page fixture.');
    }
    const checkoutUrl = await startSignupCheckout(siteId, ownerEmail);
    const sessionId = parseCheckoutSessionId(checkoutUrl);
    if (!sessionId.startsWith('cs_test_')) {
      throw new Error(`Signup Checkout URL did not contain a test session id: ${checkoutUrl}`);
    }

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await page.goto(checkoutUrl, { waitUntil: 'domcontentloaded' });
    const browserCheckout = await tryCompleteStripeHostedCheckout(page);
    let hosted = browserCheckout
      ? await waitForCheckoutSessionComplete(secretKey, sessionId, 30_000).catch(() => null)
      : null;
    if (!hosted) {
      test.info().annotations.push({
        type: 'checkout',
        description: browserCheckout
          ? 'Hosted Checkout stayed open after submit; started the subscription via the Stripe API'
          : 'Card fields were not available in hosted Checkout; started the subscription via the Stripe API'
      });
      await startTestSubscriptionFromCheckoutSession(secretKey, {
        sessionId,
        siteId,
        customerEmail: ownerEmail,
        priceId: process.env.STRIPE_PRICE_ID?.trim() || ''
      });
    }
  }

  const live = await waitForHubStatus(siteId, PROVISION_TIMEOUT_MS, (status) => {
    if (status.state === 'failed') {
      throw new Error(`Provisioning failed for ${siteId}: ${status.message ?? 'unknown'}`);
    }
    return status.ready === true && status.looksLikeHub === true && status.registered === true;
  });
  expect(live.ready).toBe(true);
  expect(live.looksLikeHub).toBe(true);
  expect(live.registered).toBe(true);

  const expectedStatuses = ['active'];
  const subscription = await waitForSubscription(secretKey, ownerEmail, siteId, expectedStatuses);
  expect(subscription?.id).toMatch(/^sub_/);
  await cancelSubscriptionNow(secretKey, subscription.id);

  const gone = await waitForHubStatus(siteId, TEARDOWN_TIMEOUT_MS, (status) => {
    return status.ready !== true && status.registered !== true && status.looksLikeHub !== true;
  });
  expect(gone.ready).toBe(false);
  expect(gone.registered).toBe(false);
  expect(gone.looksLikeHub).toBe(false);
}

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
 * @param {'free' | 'plus'} plan
 */
async function startSignup(siteId, customerEmail, plan) {
  /** @type {Record<string, string>} */
  const body = { siteId, customerEmail, plan };
  if (plan === 'plus') {
    body.billingInterval = 'month';
  }

  const response = await fetch(`${PLATFORM_API_ORIGIN}/api/public/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? `Signup failed (${response.status}): ${payload.error ?? 'unknown'}`);
  }

  return {
    plan: String(payload.plan ?? plan),
    successUrl: String(payload.successUrl ?? '').trim(),
    checkoutUrl: String(payload.checkoutUrl ?? payload.url ?? '').trim() || undefined,
    subscriptionId: String(payload.subscriptionId ?? '').trim() || undefined
  };
}

/**
 * @param {string} siteId
 * @param {string} customerEmail
 */
async function startSignupCheckout(siteId, customerEmail) {
  const signup = await startSignup(siteId, customerEmail, 'plus');
  if (!signup.checkoutUrl) {
    throw new Error('Signup did not return a Stripe Checkout URL.');
  }
  return signup.checkoutUrl;
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
 * @param {string[]} expectedStatuses
 */
async function waitForSubscription(secretKey, email, siteId, expectedStatuses) {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const subscription = await findHubSubscription(secretKey, email, siteId, { statuses: expectedStatuses });
    if (subscription?.id) return subscription;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(
    `Could not find a Stripe subscription (${expectedStatuses.join(', ')}) for ${siteId} (${email}).`
  );
}
