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
 * @returns {Promise<object>}
 */
export async function fetchWizardSchema() {
  const response = await fetch(`${API_BASE}/wizard/schema`, { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${response.status}`);
  }
  return response.json();
}

/**
 * @returns {Promise<object>}
 */
export async function fetchAutomationRuns() {
  const response = await fetch(`${API_BASE}/automation/runs`, { cache: 'no-store' });
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

/**
 * @param {Record<string, unknown>} payload
 */
export async function createSite(payload) {
  const response = await fetch(`${API_BASE}/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? `Create failed (${response.status})`);
  }
  return body;
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown>} payload
 */
export async function updateSite(siteId, payload) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? `Update failed (${response.status})`);
  }
  return body;
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown>} payload
 */
export async function deleteSite(siteId, payload) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? `Delete failed (${response.status})`);
  }
  return body;
}

/**
 * @param {string} siteId
 */
export async function deploySiteWorker(siteId) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteId)}/deploy`, {
    method: 'POST'
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? `Deploy failed (${response.status})`);
  }
  return body;
}

/**
 * @param {string} siteId
 */
export async function provisionSite(siteId) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteId)}/provision`, {
    method: 'POST'
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? `Provision failed (${response.status})`);
  }
  return body;
}
