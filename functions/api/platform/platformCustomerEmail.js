/**
 * Transactional mail to the household owner after billing events.
 *
 * Uses Resend (https://api.resend.com). Inert until RESEND_API_KEY is set on
 * the platform Pages project — the Stripe webhook still succeeds without it.
 */

import { normalizePlanTier } from './platformPlanTier.js';
import { isReturningBillingSignup } from './platformHubNameHold.js';

export const CUSTOMER_EMAIL_KINDS = /** @type {const} */ ([
  'signup',
  'upgrade',
  'past_due',
  'canceled'
]);

/** @typedef {(typeof CUSTOMER_EMAIL_KINDS)[number]} CustomerEmailKind */

/** @type {Record<CustomerEmailKind, string>} */
export const CUSTOMER_EMAIL_SENT_COLUMNS = {
  signup: 'signup_email_sent_at',
  upgrade: 'upgrade_email_sent_at',
  past_due: 'past_due_email_sent_at',
  canceled: 'canceled_email_sent_at'
};

const SENT_COLUMN_VALUES = new Set(Object.values(CUSTOMER_EMAIL_SENT_COLUMNS));

export const DEFAULT_CUSTOMER_EMAIL_FROM = 'Lovely Home <support@lovely-home.co.uk>';
export const DEFAULT_MARKETING_ORIGIN = 'https://lovely-home.co.uk';
export const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

/**
 * @param {Record<string, string | undefined>} env
 */
export function customerEmailFrom(env) {
  return env.CUSTOMER_EMAIL_FROM?.trim() || DEFAULT_CUSTOMER_EMAIL_FROM;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function customerEmailConfigured(env) {
  return Boolean(env.RESEND_API_KEY?.trim());
}

/**
 * @param {string} siteId
 */
export function customerHubUrl(siteId) {
  return `https://${siteId}.lovely-hub.com`;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function marketingSiteOrigin(env) {
  return (env.MARKETING_SITE_ORIGIN?.trim() || DEFAULT_MARKETING_ORIGIN).replace(/\/$/, '');
}

/**
 * @param {number | null | undefined} ms
 * @returns {string | null}
 */
export function formatUkDate(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeZone: 'Europe/London'
  }).format(new Date(n));
}

/**
 * @param {{
 *   eventType: string;
 *   status?: string;
 *   upgradeFromFree?: boolean;
 * }} input
 * @returns {CustomerEmailKind | null}
 */
export function lifecycleEmailKindForEvent(input) {
  const eventType = String(input.eventType ?? '');
  const status = String(input.status ?? '');

  if (eventType === 'checkout.session.completed') {
    return input.upgradeFromFree ? 'upgrade' : 'signup';
  }
  if (eventType === 'customer.subscription.created' && (status === 'trialing' || status === 'active')) {
    return 'signup';
  }
  if (eventType === 'invoice.payment_failed') return 'past_due';
  if (eventType === 'customer.subscription.deleted') return 'canceled';
  if (eventType === 'customer.subscription.updated' && status === 'canceled') return 'canceled';
  return null;
}

/**
 * @param {{
 *   hubUrl: string;
 *   successUrl: string;
 *   accountUrl: string;
 *   returning?: boolean;
 * }} input
 */
function sharedSignupLines(input) {
  const intro = input.returning
    ? 'Welcome back. We are reinstating your Lovely Home hub now — it can take up to 10 minutes, often faster when queues are clear.'
    : 'We are setting up your Lovely Home hub now — it can take up to 10 minutes, often faster when queues are clear.';

  return [
    intro,
    '',
    `Your hub: ${input.hubUrl}`,
    `Watch progress: ${input.successUrl}`,
    '',
    'Sign in with this email address. Cloudflare will send a one-time code.',
    '',
    'Fill in the house guide, then share the URL with whoever is staying — a sitter, tenant, Airbnb guest, or anyone else in the home. A wall tablet is optional; nothing extra to buy.',
    '',
    `Manage billing and your plan: ${input.accountUrl}`,
    '',
    'Questions: support@lovely-home.co.uk'
  ];
}

/**
 * @param {{
 *   kind: CustomerEmailKind;
 *   siteId: string;
 *   trialEnd?: number | null;
 *   marketingOrigin?: string;
 *   planTier?: string | null;
 *   returning?: boolean;
 *   status?: string | null;
 * }} input
 */
export function buildCustomerEmail(input) {
  const siteId = String(input.siteId);
  const hubUrl = customerHubUrl(siteId);
  const origin = (input.marketingOrigin || DEFAULT_MARKETING_ORIGIN).replace(/\/$/, '');
  const successUrl = `${origin}/signup-success?site=${encodeURIComponent(siteId)}`;
  const accountUrl = `${origin}/account`;
  const plan = normalizePlanTier(input.planTier);
  const returning = Boolean(input.returning);

  if (input.kind === 'upgrade') {
    return {
      subject: `Lovely Home+ is active — ${siteId}.lovely-hub.com`,
      text: [
        `Thanks for upgrading ${hubUrl} to Lovely Home+.`,
        '',
        'You now have unlimited guide templates and scheduled stays. There is no limit on topics or details inside each guide.',
        '',
        `Open your hub: ${hubUrl}`,
        `Manage billing: ${accountUrl}`,
        '',
        'Questions: support@lovely-home.co.uk'
      ].join('\n')
    };
  }

  if (input.kind === 'signup') {
    const shared = sharedSignupLines({ hubUrl, successUrl, accountUrl, returning });

    if (plan === 'free') {
      const planLine = returning
        ? 'Your Lovely Home Free plan is active again at no charge.'
        : 'Your Lovely Home Free plan is active at no charge. Upgrade to Lovely Home+ any time from your account page.';
      return {
        subject: returning
          ? `Welcome back — ${siteId}.lovely-hub.com`
          : `Your Lovely Home hub — ${siteId}.lovely-hub.com`,
        text: [...shared.slice(0, -3), planLine, ...shared.slice(-3)].join('\n')
      };
    }

    const plusSubject = returning
      ? `Welcome back — ${siteId}.lovely-hub.com`
      : `Your Lovely Home+ hub — ${siteId}.lovely-hub.com`;
    const plusPlanLine = returning
      ? 'Your Lovely Home+ subscription is active again. Your card on file is billed at the plan you chose.'
      : 'Your Lovely Home+ subscription is active. Your card on file is billed at the plan you chose.';
    return {
      subject: plusSubject,
      text: [...shared.slice(0, -3), plusPlanLine, ...shared.slice(-3)].join('\n')
    };
  }

  if (input.kind === 'past_due') {
    return {
      subject: `We could not take payment for ${siteId}.lovely-hub.com`,
      text: [
        `Stripe could not charge the card on file for ${hubUrl}. Your hub stays up while Stripe retries.`,
        '',
        `Update the card at ${accountUrl} (we email you a code), or write to support@lovely-home.co.uk.`,
        '',
        `Open your hub: ${hubUrl}`
      ].join('\n')
    };
  }

  return {
    subject: `Your Lovely Home hub ${siteId}.lovely-hub.com is ending`,
    text: [
      `Your subscription for ${hubUrl} has ended. The live hub will be taken down.`,
      '',
      'If you want to keep your house guide, photos, appliance manuals, and home details, download a password-encrypted full backup from Settings while the hub is still up.',
      '',
      `Your hub name (${siteId}.lovely-hub.com) stays reserved for you for 12 months if you resubscribe on Lovely Home Free or Lovely Home+.`,
      '',
      'Questions: support@lovely-home.co.uk'
    ].join('\n')
  };
}

/**
 * @param {number} creditPence
 */
export function formatReferralCreditGbp(creditPence) {
  const pounds = Number(creditPence) / 100;
  if (!Number.isFinite(pounds) || pounds <= 0) return '£0.00';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pounds);
}

/**
 * @param {{
 *   referrerSiteId: string;
 *   creditPence: number;
 *   marketingOrigin?: string;
 * }} input
 */
export function buildReferrerRewardEmail(input) {
  const referrerSiteId = String(input.referrerSiteId ?? '').trim();
  const credit = formatReferralCreditGbp(input.creditPence);
  const origin = (input.marketingOrigin || DEFAULT_MARKETING_ORIGIN).replace(/\/$/, '');
  const accountUrl = `${origin}/account`;
  const hubUrl = customerHubUrl(referrerSiteId);

  return {
    subject: `You earned ${credit} Lovely Home referral credit`,
    text: [
      `Thanks for referring a friend to Lovely Home — we added ${credit} credit to your billing account.`,
      '',
      'Stripe applies that balance automatically to your next invoice (you may see “Applied balance” on upcoming payments). Manage billing any time:',
      accountUrl,
      '',
      `Your hub: ${hubUrl}`,
      '',
      'Questions: support@lovely-home.co.uk'
    ].join('\n')
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database} db
 * @param {{
 *   referralCode: string;
 *   referrerSiteId: string;
 *   ownerEmail?: string | null;
 *   creditPence: number;
 * }} input
 * @param {typeof fetch} [fetchImpl]
 */
export async function maybeSendReferrerRewardEmail(env, db, input, fetchImpl = fetch) {
  if (!customerEmailConfigured(env)) {
    return { ok: true, action: 'referral_email_not_configured' };
  }

  const referralCode = String(input.referralCode ?? '').trim();
  const to = String(input.ownerEmail ?? '')
    .trim()
    .toLowerCase();
  if (!referralCode || !to.includes('@')) {
    return { ok: true, action: 'referral_email_missing_recipient' };
  }

  const now = Date.now();
  const claimed = await db
    .prepare(
      `UPDATE referral_codes
       SET referrer_reward_email_sent_at = ?
       WHERE code = ?
         AND referrer_rewarded_at IS NOT NULL
         AND referrer_rewarded_at > 0
         AND (referrer_reward_email_sent_at IS NULL OR referrer_reward_email_sent_at = 0)`
    )
    .bind(now, referralCode)
    .run();
  if (!d1UpdateChangedRow(claimed)) {
    return { ok: true, action: 'referral_email_already_sent' };
  }

  const built = buildReferrerRewardEmail({
    referrerSiteId: input.referrerSiteId,
    creditPence: input.creditPence,
    marketingOrigin: marketingSiteOrigin(env)
  });
  const sent = await sendResendEmail(env, { to, ...built }, fetchImpl);
  if (!sent.ok) {
    await db
      .prepare('UPDATE referral_codes SET referrer_reward_email_sent_at = NULL WHERE code = ?')
      .bind(referralCode)
      .run();
    return { ok: false, error: sent.error, message: sent.message };
  }

  return { ok: true, action: 'referral_email_sent' };
}

/**
 * @param {{ meta?: { changes?: number | null } } | null | undefined} result
 */
function d1UpdateChangedRow(result) {
  return Number(result?.meta?.changes ?? 0) > 0;
}

/**
 * Claim the lifecycle-mail lock before calling Resend.
 * Stripe sends checkout.session.completed and customer.subscription.created
 * together; a read of signup_email_sent_at is not enough — both handlers would
 * send. Only one UPDATE can win.
 *
 * @param {D1Database} db
 * @param {string} siteId
 * @param {string} column
 */
export async function markCustomerEmailSent(db, siteId, column) {
  if (!SENT_COLUMN_VALUES.has(column)) {
    throw new Error(`Unknown customer email column: ${column}`);
  }
  const now = Date.now();
  const result = await db
    .prepare(
      `UPDATE site_billing SET ${column} = ?, updated_at = ? WHERE site_id = ? AND ${column} IS NULL`
    )
    .bind(now, now, siteId)
    .run();
  return d1UpdateChangedRow(result);
}

/**
 * Undo a claim when Resend fails so Stripe can retry the same event.
 *
 * @param {D1Database} db
 * @param {string} siteId
 * @param {string} column
 */
export async function clearCustomerEmailSent(db, siteId, column) {
  if (!SENT_COLUMN_VALUES.has(column)) {
    throw new Error(`Unknown customer email column: ${column}`);
  }
  await db
    .prepare(`UPDATE site_billing SET ${column} = NULL, updated_at = ? WHERE site_id = ?`)
    .bind(Date.now(), siteId)
    .run();
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ to: string; subject: string; text: string; replyTo?: string }} message
 * @param {typeof fetch} [fetchImpl]
 */
export async function sendResendEmail(env, message, fetchImpl = fetch) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'EMAIL_NOT_CONFIGURED', message: 'RESEND_API_KEY is not set.' };
  }

  /** @type {Record<string, unknown>} */
  const payload = {
    from: customerEmailFrom(env),
    to: [message.to],
    subject: message.subject,
    text: message.text
  };
  if (message.replyTo) {
    payload.reply_to = [message.replyTo];
  }

  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      result && typeof result === 'object' && 'message' in result
        ? String(/** @type {{ message?: string }} */ (result).message)
        : `Resend ${response.status}`;
    return { ok: false, error: 'EMAIL_SEND_FAILED', message: detail };
  }
  return { ok: true, id: result && typeof result === 'object' ? String(result.id ?? '') : '' };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database} db
 * @param {{
 *   eventType: string;
 *   status?: string;
 *   siteId: string;
 *   ownerEmail?: string | null;
 *   trialEnd?: number | null;
 *   planTier?: string | null;
 *   returning?: boolean;
 *   upgradeFromFree?: boolean;
 *   priorBilling?: { [key: string]: unknown } | null;
 *   existingBilling?: { [key: string]: unknown } | null;
 * }} input
 * @param {typeof fetch} [fetchImpl]
 */
export async function maybeSendCustomerLifecycleEmail(env, db, input, fetchImpl = fetch) {
  if (!customerEmailConfigured(env)) {
    return { ok: true, action: 'email_not_configured' };
  }

  const kind = lifecycleEmailKindForEvent({
    eventType: input.eventType,
    status: input.status,
    upgradeFromFree: input.upgradeFromFree
  });
  if (!kind) {
    return { ok: true, action: 'email_not_applicable' };
  }

  const to = String(input.ownerEmail ?? '')
    .trim()
    .toLowerCase();
  if (!to || !to.includes('@')) {
    return { ok: true, action: 'email_missing_recipient' };
  }

  const column = CUSTOMER_EMAIL_SENT_COLUMNS[kind];
  if (input.existingBilling?.[column]) {
    return { ok: true, action: 'email_already_sent' };
  }

  const claimed = await markCustomerEmailSent(db, input.siteId, column);
  if (!claimed) {
    return { ok: true, action: 'email_already_sent' };
  }

  const priorBilling = input.priorBilling ?? input.existingBilling ?? null;
  const returning =
    input.returning ??
    isReturningBillingSignup(
      priorBilling && typeof priorBilling === 'object' ? priorBilling : null,
      to
    );
  const planTier =
    input.planTier ??
    (input.existingBilling && typeof input.existingBilling === 'object'
      ? String(input.existingBilling.plan_tier ?? '')
      : null);

  const built = buildCustomerEmail({
    kind,
    siteId: input.siteId,
    trialEnd: input.trialEnd,
    marketingOrigin: marketingSiteOrigin(env),
    planTier,
    returning,
    status: input.status
  });
  const sent = await sendResendEmail(env, { to, ...built }, fetchImpl);
  if (!sent.ok) {
    await clearCustomerEmailSent(db, input.siteId, column);
    return { ok: false, error: sent.error, message: sent.message };
  }

  return { ok: true, action: `email_${kind}_sent` };
}
