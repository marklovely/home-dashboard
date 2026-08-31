/**
 * Cloudflare Turnstile verification for public signup.
 *
 * Inert until TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set on the
 * platform Pages project; once both exist the signup endpoint requires a token
 * and the marketing form renders the widget from the site key it reads back
 * from /api/public/signup/status.
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * @param {Record<string, string | undefined>} env
 */
export function turnstileSiteKey(env) {
  return env.TURNSTILE_SITE_KEY?.trim() || null;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function turnstileConfigured(env) {
  return Boolean(turnstileSiteKey(env) && env.TURNSTILE_SECRET_KEY?.trim());
}

/**
 * @param {unknown} payload siteverify response body
 */
export function turnstileVerdict(payload) {
  const body = /** @type {{ success?: unknown, 'error-codes'?: unknown }} */ (payload ?? {});
  if (body.success === true) {
    return { ok: true, codes: /** @type {string[]} */ ([]) };
  }
  const codes = Array.isArray(body['error-codes'])
    ? body['error-codes'].map((code) => String(code))
    : [];
  return { ok: false, codes };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ token: string; clientIp?: string; fetchImpl?: typeof fetch }} input
 */
export async function verifyTurnstileToken(env, input) {
  if (!turnstileConfigured(env)) {
    return { ok: true, skipped: true, codes: /** @type {string[]} */ ([]) };
  }
  const token = String(input.token ?? '').trim();
  if (!token) {
    return { ok: false, skipped: false, codes: ['missing-input-response'] };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const body = new FormData();
  body.append('secret', String(env.TURNSTILE_SECRET_KEY ?? '').trim());
  body.append('response', token);
  if (input.clientIp) body.append('remoteip', input.clientIp);

  try {
    const response = await fetchImpl(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    const payload = await response.json();
    return { ...turnstileVerdict(payload), skipped: false };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      codes: ['verification-failed'],
      message: error instanceof Error ? error.message : 'unknown'
    };
  }
}
