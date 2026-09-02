/**
 * Stripe REST helpers for the on-demand lifecycle test.
 * Always use a sk_test_ key — never live.
 *
 * @param {string} secretKey
 * @param {string} method
 * @param {string} path
 * @param {Record<string, string | number | undefined>} [params]
 */
export async function stripeRequest(secretKey, method, path, params = {}) {
  const url = new URL(`https://api.stripe.com/v1${path}`);
  /** @type {Record<string, string>} */
  const headers = { Authorization: `Bearer ${secretKey}` };
  /** @type {string | undefined} */
  let body;
  if (method === 'GET') {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  } else {
    const encoded = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) encoded.set(key, String(value));
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
