const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * @param {string} pagesProject
 */
export function pagesDevHostname(pagesProject) {
  return `${String(pagesProject).trim()}.pages.dev`;
}

/**
 * Destinations required for PR preview login (same as Terraform hub Access app).
 *
 * @param {string} hostname
 * @param {string} pagesProject
 */
export function pagesPreviewAccessDestinations(hostname, pagesProject) {
  const host = String(hostname ?? '').trim().toLowerCase();
  const pagesDevHost = pagesDevHostname(pagesProject).toLowerCase();
  /** @type {{ type: 'public', uri: string }[]} */
  const destinations = [];
  if (host) destinations.push({ type: 'public', uri: host });
  if (pagesDevHost) {
    destinations.push({ type: 'public', uri: pagesDevHost });
    destinations.push({ type: 'public', uri: `*.${pagesDevHost}` });
  }
  return destinations;
}

/**
 * @param {unknown} destinations
 * @param {{ type: 'public', uri: string }[]} required
 */
export function mergeAccessDestinations(destinations, required) {
  /** @type {{ type: 'public', uri: string }[]} */
  const merged = [];
  const seen = new Set();

  for (const entry of Array.isArray(destinations) ? destinations : []) {
    const uri = String(/** @type {{ uri?: string }} */ (entry)?.uri ?? '')
      .trim()
      .toLowerCase();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    merged.push({
      type: 'public',
      uri: String(/** @type {{ uri?: string }} */ (entry)?.uri ?? '').trim()
    });
  }

  for (const entry of required) {
    const uri = entry.uri.trim().toLowerCase();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    merged.push(entry);
  }

  return merged;
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} appId
 * @param {typeof fetch} fetchImpl
 */
async function fetchAccessApp(accountId, token, appId, fetchImpl) {
  const response = await fetchImpl(`${CF_API_BASE}/accounts/${accountId}/access/apps/${appId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    const msg = payload?.errors?.map((error) => error.message).join('; ') ?? `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return payload.result;
}

/**
 * Ensure the Pages Access app covers *.pages.dev preview hostnames.
 *
 * @param {Object} options
 * @param {string} options.accountId
 * @param {string} options.token
 * @param {string} options.accessAppId
 * @param {string} options.hostname
 * @param {string} options.pagesProject
 * @param {typeof fetch} [options.fetchImpl]
 */
export async function ensurePagesPreviewAccessDestinations({
  accountId,
  token,
  accessAppId,
  hostname,
  pagesProject,
  fetchImpl = fetch
}) {
  const appId = String(accessAppId ?? '').trim();
  if (!appId) {
    return {
      ok: false,
      code: 'MISSING_ACCESS_APP',
      message: 'Site has no access_pages_app_id in manifest — run terraform apply or discover-access-app-ids.'
    };
  }

  const required = pagesPreviewAccessDestinations(hostname, pagesProject);
  const app = await fetchAccessApp(accountId, token, appId, fetchImpl);
  const merged = mergeAccessDestinations(app.destinations, required);
  const beforeUris = new Set(
    (Array.isArray(app.destinations) ? app.destinations : []).map((entry) =>
      String(/** @type {{ uri?: string }} */ (entry)?.uri ?? '')
        .trim()
        .toLowerCase()
    )
  );
  const added = required.filter((entry) => !beforeUris.has(entry.uri.toLowerCase())).map((entry) => entry.uri);

  if (added.length === 0) {
    return {
      ok: true,
      updated: false,
      message: 'Access app already includes Pages preview hostnames.'
    };
  }

  const response = await fetchImpl(`${CF_API_BASE}/accounts/${accountId}/access/apps/${appId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: app.type ?? 'self_hosted',
      domain: app.domain,
      destinations: merged,
      session_duration: app.session_duration,
      logo_url: app.logo_url,
      custom_deny_url: app.custom_deny_url,
      custom_deny_message: app.custom_deny_message,
      custom_non_identity_deny_url: app.custom_non_identity_deny_url
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    const msg = payload?.errors?.map((error) => error.message).join('; ') ?? `HTTP ${response.status}`;
    return {
      ok: false,
      code: 'ACCESS_UPDATE_FAILED',
      message: msg
    };
  }

  return {
    ok: true,
    updated: true,
    added,
    message: `Access app updated for preview URLs (${added.join(', ')}).`
  };
}
