/**
 * @param {string | URL | { href?: string }} urlLike
 */
export function checkoutUrlString(urlLike) {
  if (typeof urlLike === 'string') return urlLike;
  if (urlLike && typeof urlLike === 'object' && 'href' in urlLike) {
    return String(urlLike.href ?? '');
  }
  return String(urlLike ?? '');
}

/**
 * Hosted Checkout / Payment Link, including Stripe's Onelink sandbox.
 *
 * @param {string | URL | { href?: string }} urlLike
 */
export function isStripeHostedCheckoutUrl(urlLike) {
  let parsed;
  try {
    parsed = new URL(checkoutUrlString(urlLike));
  } catch {
    return false;
  }
  const host = parsed.hostname;
  if (host === 'checkout.stripe.com' || host === 'buy.stripe.com' || host === 'checkout.link.com') {
    return true;
  }
  if (host.endsWith('.stripe.com') && /\/(c\/pay|pay|checkout)\b/.test(parsed.pathname)) {
    return true;
  }
  return false;
}

/**
 * Checkout finished: marketing success page, Cloudflare Access, or any non-Stripe return.
 *
 * @param {string | URL | { href?: string }} urlLike
 */
export function checkoutHasFinished(urlLike) {
  const href = checkoutUrlString(urlLike);
  if (/signup-success\.html/i.test(href)) return true;
  if (href.includes('cloudflareaccess.com') || href.includes('/cdn-cgi/access')) return true;
  return Boolean(href) && !isStripeHostedCheckoutUrl(href);
}

/**
 * @param {string | URL | { href?: string }} urlLike
 */
export function parseCheckoutSessionId(urlLike) {
  const match = checkoutUrlString(urlLike).match(/cs_(?:test|live)_[A-Za-z0-9]+/);
  return match ? match[0] : '';
}
