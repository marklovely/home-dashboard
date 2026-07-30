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
 * @param {Response} response
 */
async function assertUpstreamAccepted(response) {
  if (!response.ok) {
    throw new Error('UPSTREAM_FAILED');
  }

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    return true;
  }

  try {
    const payload = await response.json();
    if (payload && typeof payload === 'object' && 'message' in payload && !('pressed' in payload)) {
      throw new Error('UPSTREAM_FAILED');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'UPSTREAM_FAILED') {
      throw error;
    }
  }

  return true;
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

  const trimmedCode = accessCode.trim();
  const body = JSON.stringify({
    virtualButton: virtualButtonId,
    accessCode: trimmedCode
  });

  let response = await fetchImpl(DEFAULT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store'
  });

  if (!response.ok) {
    const legacyUrl = buildVirtualButtonUrl(trimmedCode, virtualButtonId);
    response = await fetchImpl(legacyUrl, { method: 'GET', cache: 'no-store' });
  }

  return assertUpstreamAccepted(response);
}
