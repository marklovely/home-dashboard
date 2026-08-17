const API_BASE = '/api/platform';

/**
 * @returns {Promise<object>}
 */
export async function fetchSites() {
  const response = await fetch(`${API_BASE}/sites`, { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${response.status}`);
  }
  return response.json();
}

/**
 * @param {string} siteId
 */
export async function fetchSiteHealth(siteId) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteId)}/health`, {
    cache: 'no-store'
  });
  return response.json();
}

/**
 * @param {string} siteId
 */
export async function fetchSiteAccessProbe(siteId) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteId)}/access-probe`, {
    cache: 'no-store'
  });
  return response.json();
}
