const API_BASE = '/api/platform';

/**
 * @returns {Promise<object>}
 */
export async function fetchStripeMode() {
  const response = await fetch(`${API_BASE}/stripe/mode`, { cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? `Stripe mode failed (${response.status})`);
  }
  return body;
}

/**
 * @param {{ mode: 'test' | 'live', confirmation: string, acknowledgeOpenSubscriptions?: boolean }} payload
 */
export async function setStripeMode(payload) {
  const response = await fetch(`${API_BASE}/stripe/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    throw new Error(body.message ?? `Stripe mode update failed (${response.status})`);
  }
  return body;
}

/**
 * @returns {Promise<object>}
 */
export async function fetchMarketingAccess() {
  const response = await fetch(`${API_BASE}/marketing-access`, { cache: 'no-store' });
  return response.json();
}

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
export async function fetchSitePreviewStatus(siteId) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteId)}/previews`, {
    cache: 'no-store'
  });
  return response.json();
}

/**
 * @param {string} siteId
 * @param {boolean} enabled
 */
export async function setSitePreviewEnabled(siteId, enabled) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteId)}/previews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok && !body.ok) {
    throw new Error(body.message ?? `Preview update failed (${response.status})`);
  }
  return body;
}

/**
 * @param {string} siteId
 */
export async function fetchSiteUsage(siteId) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteId)}/usage`, {
    cache: 'no-store'
  });
  return response.json();
}

/**
 * @returns {Promise<object>}
 */
export async function fetchUsageSummary() {
  const response = await fetch(`${API_BASE}/usage/summary`, { cache: 'no-store' });
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

/**
 * @param {string} siteId
 * @param {string} customerEmail
 */
export async function startBillingCheckout(siteId, customerEmail) {
  const response = await fetch(`${API_BASE}/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, customerEmail })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? `Checkout failed (${response.status})`);
  }
  return body;
}
