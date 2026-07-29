const DEFAULT_ENDPOINT = 'https://api.virtualbuttons.com/v1';

/**
 * @param {string} accessCode
 * @param {number} virtualButtonId
 * @param {string} [endpoint]
 */
export function buildVirtualButtonUrl(accessCode, virtualButtonId, endpoint = DEFAULT_ENDPOINT) {
  const url = new URL(endpoint);
  url.searchParams.set('virtualButton', String(virtualButtonId));
  url.searchParams.set('accessCode', accessCode);
  return url.toString();
}

/**
 * @param {object} params
 * @param {string} params.accessCode
 * @param {number} params.virtualButtonId
 * @param {typeof fetch} params.fetchImpl
 */
export async function triggerVirtualButtonUpstream({ accessCode, virtualButtonId, fetchImpl = fetch }) {
  if (!accessCode?.trim()) {
    throw new Error('MISSING_ACCESS_CODE');
  }
  const url = buildVirtualButtonUrl(accessCode, virtualButtonId);
  const response = await fetchImpl(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    throw new Error('UPSTREAM_FAILED');
  }
  return true;
}
