import { GITHUB_STRIPE_MODE_VARIABLE, setGithubActionsVariable } from './platformGitHub.js';

/** @typedef {'test' | 'live'} StripeMode */

/** @typedef {{
 *   secretKey: string,
 *   webhookSecret: string,
 *   priceId: string,
 *   priceIdYearly: string
 * }} StripeCredentials */

export const STRIPE_MODE_SETTING_KEY = 'stripe_mode';
export const GO_LIVE_CONFIRMATION = 'GO LIVE';
export const SWITCH_TO_TEST_CONFIRMATION = 'USE TEST';

/**
 * @param {unknown} value
 * @returns {StripeMode}
 */
export function normalizeStripeMode(value) {
  return String(value ?? '').trim().toLowerCase() === 'live' ? 'live' : 'test';
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {StripeMode} mode
 * @returns {StripeCredentials}
 */
export function stripeCredentialsForMode(env, mode) {
  if (mode === 'live') {
    return {
      secretKey: env.STRIPE_SECRET_KEY_LIVE?.trim() || '',
      webhookSecret: env.STRIPE_WEBHOOK_SECRET_LIVE?.trim() || '',
      priceId: env.STRIPE_PRICE_ID_LIVE?.trim() || '',
      priceIdYearly: env.STRIPE_PRICE_ID_YEARLY?.trim() || ''
    };
  }
  return {
    secretKey: env.STRIPE_SECRET_KEY?.trim() || '',
    webhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() || '',
    priceId: env.STRIPE_PRICE_ID?.trim() || '',
    priceIdYearly: env.STRIPE_PRICE_ID_YEARLY?.trim() || ''
  };
}

/**
 * @param {StripeCredentials} creds
 */
export function stripeSetConfigured(creds) {
  return Boolean(creds.secretKey && creds.webhookSecret && (creds.priceId || creds.priceIdYearly));
}

/**
 * @param {StripeCredentials} creds
 */
export function stripeKeyPrefix(creds) {
  const key = creds.secretKey;
  if (key.startsWith('sk_live')) return 'sk_live';
  if (key.startsWith('sk_test')) return 'sk_test';
  if (key.startsWith('rk_live')) return 'rk_live';
  if (key.startsWith('rk_test')) return 'rk_test';
  return key ? 'unknown' : '';
}

/**
 * @param {D1Database | null} db
 * @returns {Promise<StripeMode>}
 */
export async function getStripeMode(db) {
  if (!db) return 'test';
  try {
    const row = await db
      .prepare('SELECT value FROM platform_settings WHERE key = ? LIMIT 1')
      .bind(STRIPE_MODE_SETTING_KEY)
      .first();
    return normalizeStripeMode(row?.value);
  } catch {
    return 'test';
  }
}

/**
 * @param {D1Database} db
 * @param {StripeMode} mode
 */
export async function setStripeMode(db, mode) {
  const next = normalizeStripeMode(mode);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(STRIPE_MODE_SETTING_KEY, next, now)
    .run();
  return next;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null} db
 */
export async function getActiveStripeCredentials(env, db = null) {
  const mode = await getStripeMode(db);
  const credentials = stripeCredentialsForMode(env, mode);
  return {
    mode,
    credentials,
    configured: stripeSetConfigured(credentials),
    keyPrefix: stripeKeyPrefix(credentials),
    testConfigured: stripeSetConfigured(stripeCredentialsForMode(env, 'test')),
    liveConfigured: stripeSetConfigured(stripeCredentialsForMode(env, 'live'))
  };
}

/**
 * @param {D1Database | null} db
 */
export async function countOpenBillingSubscriptions(db) {
  if (!db) return 0;
  try {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM site_billing
         WHERE status IN ('trialing', 'active', 'past_due', 'incomplete')`
      )
      .first();
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

/**
 * @param {unknown} confirmation
 * @param {StripeMode} nextMode
 */
export function stripeModeConfirmationValid(confirmation, nextMode) {
  const typed = String(confirmation ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  return nextMode === 'live' ? typed === GO_LIVE_CONFIRMATION : typed === SWITCH_TO_TEST_CONFIRMATION;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null} db
 */
export async function describeStripeMode(env, db) {
  const active = await getActiveStripeCredentials(env, db);
  return {
    mode: active.mode,
    stripeBillingConfigured: active.configured,
    testConfigured: active.testConfigured,
    liveConfigured: active.liveConfigured,
    keyPrefix: active.keyPrefix,
    openSubscriptions: await countOpenBillingSubscriptions(db),
    githubVariable: GITHUB_STRIPE_MODE_VARIABLE
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null} db
 * @param {{
 *   mode?: unknown,
 *   confirmation?: unknown,
 *   acknowledgeOpenSubscriptions?: unknown
 * }} body
 * @param {{ setGithubActionsVariable?: typeof setGithubActionsVariable }} [deps]
 */
export async function applyStripeMode(env, db, body = {}, deps = {}) {
  const nextMode = normalizeStripeMode(body.mode);
  if (!stripeModeConfirmationValid(body.confirmation, nextMode)) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'CONFIRMATION_REQUIRED',
        message:
          nextMode === 'live'
            ? `Type ${GO_LIVE_CONFIRMATION} to switch the platform to live Stripe.`
            : `Type ${SWITCH_TO_TEST_CONFIRMATION} to switch the platform back to test Stripe.`
      }
    };
  }

  const creds = stripeCredentialsForMode(env, nextMode);
  if (!stripeSetConfigured(creds)) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'KEYS_MISSING',
        message:
          nextMode === 'live'
            ? 'Live Stripe keys and at least one live price id are not set on the platform Pages project.'
            : 'Test Stripe keys and at least one test price id are not set on the platform Pages project.'
      }
    };
  }

  if (!db) {
    return {
      status: 503,
      body: {
        ok: false,
        error: 'BILLING_DB_NOT_CONFIGURED',
        message: 'PLATFORM_BILLING_DB binding is missing.'
      }
    };
  }

  const openSubscriptions = await countOpenBillingSubscriptions(db);
  if (openSubscriptions > 0 && body.acknowledgeOpenSubscriptions !== true) {
    return {
      status: 409,
      body: {
        ok: false,
        error: 'OPEN_SUBSCRIPTIONS',
        message:
          nextMode === 'live'
            ? `There are ${openSubscriptions} open subscriptions in D1. Test-mode customers will not work after go-live. Tick the acknowledgement to continue.`
            : `There are ${openSubscriptions} open subscriptions in D1. Live customers will not work after switching to test. Tick the acknowledgement to continue.`,
        openSubscriptions
      }
    };
  }

  await setStripeMode(db, nextMode);
  const setVariable = deps.setGithubActionsVariable ?? setGithubActionsVariable;
  const github = await setVariable(env, GITHUB_STRIPE_MODE_VARIABLE, nextMode);
  const status = await describeStripeMode(env, db);
  return {
    status: 200,
    body: {
      ok: true,
      ...status,
      githubUpdated: github.ok === true,
      githubWarning: github.ok ? null : String(github.message ?? 'Could not update the GitHub STRIPE_MODE variable.')
    }
  };
}
