/**
 * Transactional mail to the household owner after billing events.
 *
 * Uses Resend (https://api.resend.com). Inert until RESEND_API_KEY is set on
 * the platform Pages project — the Stripe webhook still succeeds without it.
 */

export const CUSTOMER_EMAIL_KINDS = /** @type {const} */ ([
  'signup',
  'trial_ending',
  'past_due',
  'canceled'
]);

/** @typedef {(typeof CUSTOMER_EMAIL_KINDS)[number]} CustomerEmailKind */

/** @type {Record<CustomerEmailKind, string>} */
export const CUSTOMER_EMAIL_SENT_COLUMNS = {
  signup: 'signup_email_sent_at',
  trial_ending: 'trial_ending_email_sent_at',
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
 * }} input
 * @returns {CustomerEmailKind | null}
 */
export function lifecycleEmailKindForEvent(input) {
  const eventType = String(input.eventType ?? '');
  const status = String(input.status ?? '');

  if (eventType === 'checkout.session.completed') return 'signup';
  if (eventType === 'customer.subscription.created' && (status === 'trialing' || status === 'active')) {
    return 'signup';
  }
  if (eventType === 'customer.subscription.trial_will_end') return 'trial_ending';
  if (eventType === 'invoice.payment_failed') return 'past_due';
  if (eventType === 'customer.subscription.deleted') return 'canceled';
  if (eventType === 'customer.subscription.updated' && status === 'canceled') return 'canceled';
  return null;
}

/**
 * @param {{
 *   kind: CustomerEmailKind;
 *   siteId: string;
 *   trialEnd?: number | null;
 *   marketingOrigin?: string;
 * }} input
 */
export function buildCustomerEmail(input) {
  const siteId = String(input.siteId);
  const hubUrl = customerHubUrl(siteId);
  const origin = (input.marketingOrigin || DEFAULT_MARKETING_ORIGIN).replace(/\/$/, '');
  const successUrl = `${origin}/signup-success.html?site=${encodeURIComponent(siteId)}`;
  const accountUrl = `${origin}/account.html`;
  const trialDate = formatUkDate(input.trialEnd);

  if (input.kind === 'signup') {
    return {
      subject: `Your Lovely Home hub — ${siteId}.lovely-hub.com`,
      text: [
        'Your 7-day trial has started. We are setting up your private household hub now — it usually takes about 10 minutes.',
        '',
        `Your hub: ${hubUrl}`,
        `Watch progress: ${successUrl}`,
        '',
        'Sign in with this email address. Cloudflare will send a one-time code.',
        '',
        'Use the week to fill in the house guide, then share the URL with whoever is staying — a sitter, tenant, Airbnb guest, or anyone else in the home. A wall tablet is optional; nothing extra to buy.',
        '',
        'You are not charged today. After the trial your card is billed at the plan you chose. Cancel from your account page before the trial ends to pay nothing:',
        accountUrl,
        '',
        'Questions: support@lovely-home.co.uk'
      ].join('\n')
    };
  }

  if (input.kind === 'trial_ending') {
    const when = trialDate ? ` on ${trialDate}` : ' soon';
    return {
      subject: `Your Lovely Home trial ends${trialDate ? ` on ${trialDate}` : ' soon'}`,
      text: [
        `Your trial for ${hubUrl} ends${when}. If you do nothing, your card will be charged then.`,
        '',
        `To cancel and pay nothing, open ${accountUrl} (we email you a code), or write to support@lovely-home.co.uk.`,
        '',
        `Open your hub: ${hubUrl}`
      ].join('\n')
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
      'If you want to keep your house guide and home details, download a password-encrypted backup from the hub while it is still up. Photos and appliance PDFs are not inside that file.',
      '',
      'Questions: support@lovely-home.co.uk'
    ].join('\n')
  };
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 * @param {string} column
 */
export async function markCustomerEmailSent(db, siteId, column) {
  if (!SENT_COLUMN_VALUES.has(column)) {
    throw new Error(`Unknown customer email column: ${column}`);
  }
  const now = Date.now();
  await db
    .prepare(`UPDATE site_billing SET ${column} = ?, updated_at = ? WHERE site_id = ?`)
    .bind(now, now, siteId)
    .run();
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ to: string; subject: string; text: string }} message
 * @param {typeof fetch} [fetchImpl]
 */
export async function sendResendEmail(env, message, fetchImpl = fetch) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'EMAIL_NOT_CONFIGURED', message: 'RESEND_API_KEY is not set.' };
  }

  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: customerEmailFrom(env),
      to: [message.to],
      subject: message.subject,
      text: message.text
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(/** @type {{ message?: string }} */ (payload).message)
        : `Resend ${response.status}`;
    return { ok: false, error: 'EMAIL_SEND_FAILED', message: detail };
  }
  return { ok: true, id: payload && typeof payload === 'object' ? String(payload.id ?? '') : '' };
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
 *   existingBilling?: { [key: string]: unknown } | null;
 * }} input
 * @param {typeof fetch} [fetchImpl]
 */
export async function maybeSendCustomerLifecycleEmail(env, db, input, fetchImpl = fetch) {
  if (!customerEmailConfigured(env)) {
    return { ok: true, action: 'email_not_configured' };
  }

  const kind = lifecycleEmailKindForEvent({ eventType: input.eventType, status: input.status });
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

  const built = buildCustomerEmail({
    kind,
    siteId: input.siteId,
    trialEnd: input.trialEnd,
    marketingOrigin: marketingSiteOrigin(env)
  });
  const sent = await sendResendEmail(env, { to, ...built }, fetchImpl);
  if (!sent.ok) {
    return { ok: false, error: sent.error, message: sent.message };
  }

  await markCustomerEmailSent(db, input.siteId, column);
  return { ok: true, action: `email_${kind}_sent` };
}
