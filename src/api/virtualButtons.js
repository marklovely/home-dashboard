import { resolveApiClient } from './client.js';

const DEFAULT_ENDPOINT = 'https://api.virtualbuttons.com/v1';

export function buildVirtualButtonUrl(accessCode, buttonId, endpoint = DEFAULT_ENDPOINT) {
  if (!accessCode || accessCode.includes('PASTE_YOUR')) {
    throw new Error('Virtual Buttons access code is missing.');
  }
  if (!Number.isInteger(buttonId) || buttonId < 1) {
    throw new Error('Button ID must be a positive integer.');
  }
  const url = new URL(endpoint);
  url.searchParams.set('virtualButton', String(buttonId));
  url.searchParams.set('accessCode', accessCode);
  return url.toString();
}

/**
 * @param {Object} params
 * @param {string} params.accessCode
 * @param {number} params.buttonId
 * @param {typeof fetch} [params.fetchImpl]
 */
export async function triggerVirtualButton({ accessCode, buttonId, fetchImpl }) {
  const client = resolveApiClient(fetchImpl);
  const url = buildVirtualButtonUrl(accessCode, buttonId);
  // Virtual Buttons accepts the GET request but does not expose browser CORS
  // response headers. no-cors still sends the request; the returned response is
  // intentionally opaque, so its HTTP status cannot be inspected in the browser.
  await client.get(url, { mode: 'no-cors', cache: 'no-store' });
  return true;
}
