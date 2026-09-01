import { customerEmailConfigured, sendResendEmail } from './platformCustomerEmail.js';
import { turnstileSiteKey, verifyTurnstileToken } from './platformSignupTurnstile.js';

export const DEFAULT_SUPPORT_INBOX = 'support@lovely-home.co.uk';
export const CONTACT_SUBJECT_MAX = 120;
export const CONTACT_MESSAGE_MAX = 4000;
export const CONTACT_NAME_MAX = 80;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {Record<string, string | undefined>} env
 */
export function supportInboxEmail(env) {
  const explicit = env.SUPPORT_INBOX_EMAIL?.trim().toLowerCase();
  if (explicit && EMAIL_RE.test(explicit)) return explicit;
  const from = env.CUSTOMER_EMAIL_FROM?.trim() ?? '';
  const match = from.match(/<([^>]+)>/);
  const extracted = (match ? match[1] : from).trim().toLowerCase();
  if (extracted && EMAIL_RE.test(extracted)) return extracted;
  return DEFAULT_SUPPORT_INBOX;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function publicContactStatus(env) {
  return {
    enabled: customerEmailConfigured(env),
    turnstileSiteKey: turnstileSiteKey(env)
  };
}

/**
 * @param {unknown} value
 * @param {number} max
 */
function cleanLine(value, max) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * @param {unknown} value
 * @param {number} max
 */
function cleanMultiline(value, max) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * @param {Record<string, unknown>} body
 */
export function parsePublicContactInput(body) {
  const website = String(body.website ?? body.company ?? '').trim();
  const name = cleanLine(body.name, CONTACT_NAME_MAX);
  const email = cleanLine(body.email, 254).toLowerCase();
  const hub = cleanLine(body.hub ?? body.siteId ?? body.site_id, 80);
  const subject = cleanLine(body.subject, CONTACT_SUBJECT_MAX);
  const message = cleanMultiline(body.message, CONTACT_MESSAGE_MAX);
  const turnstileToken = String(body.turnstileToken ?? body['cf-turnstile-response'] ?? '').trim();

  return { website, name, email, hub, subject, message, turnstileToken };
}

/**
 * @param {ReturnType<typeof parsePublicContactInput>} input
 */
export function validatePublicContactInput(input) {
  if (input.website) {
    return { error: 'IGNORED', message: 'Thanks — we will be in touch if needed.' };
  }
  if (!input.name) {
    return { error: 'INVALID_NAME', message: 'Enter your name.' };
  }
  if (!input.email || !EMAIL_RE.test(input.email)) {
    return { error: 'INVALID_EMAIL', message: 'Enter a valid email address.' };
  }
  if (!input.subject) {
    return { error: 'INVALID_SUBJECT', message: 'Enter a subject.' };
  }
  if (!input.message || input.message.length < 10) {
    return { error: 'INVALID_MESSAGE', message: 'Enter a short message so we know how to help.' };
  }
  return null;
}

/**
 * @param {ReturnType<typeof parsePublicContactInput>} input
 */
export function buildSupportContactEmail(input) {
  const hubLine = input.hub ? input.hub : '(not given)';
  return {
    subject: `Support: ${input.subject}`,
    text: [
      `From: ${input.name} <${input.email}>`,
      `Hub: ${hubLine}`,
      '',
      input.message
    ].join('\n')
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{
 *   body: Record<string, unknown>;
 *   clientIp?: string;
 *   fetchImpl?: typeof fetch;
 * }} input
 */
export async function handlePublicContact(env, input) {
  const parsed = parsePublicContactInput(input.body);
  const invalid = validatePublicContactInput(parsed);
  if (invalid) {
    if (invalid.error === 'IGNORED') {
      return { status: 200, body: { ok: true, message: invalid.message } };
    }
    return { status: 400, body: invalid };
  }

  if (!customerEmailConfigured(env)) {
    return {
      status: 503,
      body: {
        error: 'EMAIL_NOT_CONFIGURED',
        message: `Email is not available just now. Write to ${DEFAULT_SUPPORT_INBOX} instead.`
      }
    };
  }

  const turnstile = await verifyTurnstileToken(env, {
    token: parsed.turnstileToken,
    clientIp: input.clientIp,
    fetchImpl: input.fetchImpl
  });
  if (!turnstile.ok) {
    return {
      status: 403,
      body: {
        error: 'TURNSTILE_FAILED',
        message: 'Complete the “I am human” check to send a message.'
      }
    };
  }

  const built = buildSupportContactEmail(parsed);
  const sent = await sendResendEmail(
    env,
    {
      to: supportInboxEmail(env),
      replyTo: parsed.email,
      ...built
    },
    input.fetchImpl
  );
  if (!sent.ok) {
    return {
      status: 502,
      body: {
        error: sent.error ?? 'EMAIL_SEND_FAILED',
        message: `Could not send just now. Email ${DEFAULT_SUPPORT_INBOX} instead.`
      }
    };
  }

  return {
    status: 200,
    body: { ok: true, message: 'Thanks — we will reply to the email you entered.' }
  };
}
