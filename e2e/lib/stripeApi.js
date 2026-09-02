/**
 * Stripe REST helpers for the on-demand lifecycle test.
 * Always use a sk_test_ key — never live.
 *
 * Flatten nested Stripe form fields (`items[0][price]`, `metadata[site_id]`).
 *
 * @param {Record<string, unknown>} object
 * @param {string} [prefix]
 * @returns {[string, string][]}
 */
export function encodeStripeFormEntries(object, prefix = '') {
  /** @type {[string, string][]} */
  const entries = [];
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          entries.push(...encodeStripeFormEntries(/** @type {Record<string, unknown>} */ (item), `${fullKey}[${index}]`));
        } else if (item !== undefined && item !== null) {
          entries.push([`${fullKey}[${index}]`, String(item)]);
        }
      });
      continue;
    }
    if (typeof value === 'object') {
      entries.push(...encodeStripeFormEntries(/** @type {Record<string, unknown>} */ (value), fullKey));
      continue;
    }
    entries.push([fullKey, String(value)]);
  }
  return entries;
}

/**
 * @param {string} secretKey
 * @param {string} method
 * @param {string} path
 * @param {Record<string, unknown>} [params]
 */
export async function stripeRequest(secretKey, method, path, params = {}) {
  const url = new URL(`https://api.stripe.com/v1${path}`);
  /** @type {Record<string, string>} */
  const headers = { Authorization: `Bearer ${secretKey}` };
  /** @type {string | undefined} */
  let body;
  if (method === 'GET') {
    for (const [key, value] of encodeStripeFormEntries(params)) {
      url.searchParams.append(key, value);
    }
  } else {
    const encoded = new URLSearchParams();
    for (const [key, value] of encodeStripeFormEntries(params)) {
      encoded.append(key, value);
    }
    body = encoded.toString();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const response = await fetch(url, { method, headers, body });
  const payload = await response.json();
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error?.message ?? response.status)
        : `Stripe API ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

/**
 * @param {string} baseEmail
 * @param {string} siteId
 */
export function uniqueOwnerEmail(baseEmail, siteId) {
  const trimmed = String(baseEmail ?? '').trim().toLowerCase();
  const at = trimmed.indexOf('@');
  if (at <= 0) {
    throw new Error('E2E_OWNER_EMAIL must be a valid email address.');
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.includes('+')) return `${local}-${siteId}@${domain}`;
  return `${local}+${siteId}@${domain}`;
}

/**
 * @param {string} secretKey
 * @param {string} email
 * @param {string} siteId
 */
export async function findTrialingSubscription(secretKey, email, siteId) {
  const customers = await stripeRequest(secretKey, 'GET', '/customers', { email, limit: 10 });
  const list = Array.isArray(customers.data) ? customers.data : [];
  for (const customer of list) {
    const subscriptions = await stripeRequest(secretKey, 'GET', '/subscriptions', {
      customer: customer.id,
      status: 'trialing',
      limit: 10
    });
    const match = (subscriptions.data ?? []).find(
      (row) => String(row.metadata?.site_id ?? '') === siteId || String(row.metadata?.siteId ?? '') === siteId
    );
    if (match) return match;
    const fallback = (subscriptions.data ?? [])[0];
    if (fallback && list.length === 1) return fallback;
  }
  return null;
}

/**
 * Immediate cancel (not cancel-at-period-end) so billing deprovision runs during trial.
 *
 * @param {string} secretKey
 * @param {string} subscriptionId
 */
export async function cancelSubscriptionNow(secretKey, subscriptionId) {
  return stripeRequest(secretKey, 'DELETE', `/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

/**
 * @param {string} secretKey
 * @param {string} sessionId
 * @param {Record<string, unknown>} [params]
 */
export async function getCheckoutSession(secretKey, sessionId, params = {}) {
  return stripeRequest(secretKey, 'GET', `/checkout/sessions/${encodeURIComponent(sessionId)}`, params);
}

/**
 * Hosted Checkout can sit on "Processing" without navigating. The session status is the source of truth.
 *
 * @param {string} secretKey
 * @param {string} sessionId
 * @param {number} [timeoutMs]
 */
export async function waitForCheckoutSessionComplete(secretKey, sessionId, timeoutMs = 120_000) {
  const started = Date.now();
  /** @type {Record<string, unknown>} */
  let last = {};
  while (Date.now() - started < timeoutMs) {
    last = await getCheckoutSession(secretKey, sessionId);
    const status = String(last.status ?? '');
    if (status === 'complete') return last;
    if (status === 'expired') {
      throw new Error(`Stripe Checkout session ${sessionId} expired before the trial started.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(
    `Stripe Checkout session ${sessionId} stayed ${String(last.status ?? 'unknown')} (payment ${String(last.payment_status ?? 'unknown')}).`
  );
}

/**
 * @param {Record<string, unknown>} session
 */
export function priceIdFromCheckoutSession(session) {
  const items = /** @type {{ data?: Array<{ price?: unknown }> }} */ (session.line_items);
  const price = items?.data?.[0]?.price;
  if (typeof price === 'string' && price.startsWith('price_')) return price;
  if (price && typeof price === 'object' && 'id' in price) {
    return String(/** @type {{ id?: string }} */ (price).id ?? '');
  }
  return '';
}

/**
 * @param {string} secretKey
 * @param {string} sessionId
 */
export async function expireCheckoutSession(secretKey, sessionId) {
  return stripeRequest(secretKey, 'POST', `/checkout/sessions/${encodeURIComponent(sessionId)}/expire`);
}

/**
 * Hosted Checkout (Onelink) can sit on Processing forever under Playwright.
 * Expire the open session and start the same trial via the API so provision still runs.
 *
 * @param {string} secretKey
 * @param {{ sessionId: string; siteId: string; customerEmail: string; priceId?: string }} input
 */
export async function startTestTrialFromCheckoutSession(secretKey, input) {
  const session = await getCheckoutSession(secretKey, input.sessionId, { 'expand[]': 'line_items' });
  if (String(session.status ?? '') === 'complete') return session;

  const priceId = input.priceId?.trim() || priceIdFromCheckoutSession(session);
  if (!priceId) {
    throw new Error('Cannot start a test trial without a Stripe price id from Checkout or STRIPE_PRICE_ID.');
  }

  if (String(session.status ?? '') !== 'expired') {
    try {
      await expireCheckoutSession(secretKey, input.sessionId);
    } catch {
      const latest = await getCheckoutSession(secretKey, input.sessionId);
      if (String(latest.status ?? '') === 'complete') return latest;
    }
  }

  const paymentMethod = await stripeRequest(secretKey, 'POST', '/payment_methods', {
    type: 'card',
    card: { token: 'tok_visa' }
  });
  const customer = await stripeRequest(secretKey, 'POST', '/customers', {
    email: input.customerEmail,
    payment_method: paymentMethod.id,
    invoice_settings: { default_payment_method: paymentMethod.id },
    metadata: { site_id: input.siteId }
  });
  return stripeRequest(secretKey, 'POST', '/subscriptions', {
    customer: customer.id,
    items: [{ price: priceId }],
    trial_period_days: 7,
    default_payment_method: paymentMethod.id,
    metadata: { site_id: input.siteId },
    payment_settings: { save_default_payment_method: 'on_subscription' }
  });
}
