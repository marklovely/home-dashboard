#!/usr/bin/env node
/**
 * Discover Cloudflare Access application IDs for a hub hostname / worker name.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… \
 *     node scripts/discover-access-app-ids.mjs dashboard.lovely-home.co.uk lovely-home-hub-api
 */
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const pagesHost = process.argv[2]?.trim().toLowerCase();
const workerName = process.argv[3]?.trim().toLowerCase();

if (!accountId || !token) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.');
  process.exit(1);
}

if (!pagesHost) {
  console.error('Usage: node scripts/discover-access-app-ids.mjs <pages_hostname> [worker_script_name]');
  process.exit(1);
}

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * @param {string} path
 */
async function cfGet(path) {
  const response = await fetch(`${CF_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(`Cloudflare API failed (${response.status}): ${JSON.stringify(payload?.errors ?? payload)}`);
  }
  return payload.result;
}

/**
 * @param {unknown} app
 */
function appHostnames(app) {
  const record = /** @type {Record<string, unknown>} */ (app);
  /** @type {string[]} */
  const hosts = [];
  const domain = String(record.domain ?? '').trim().toLowerCase();
  if (domain) hosts.push(domain);
  const destinations = record.destinations;
  if (Array.isArray(destinations)) {
    for (const destination of destinations) {
      const uri = String(/** @type {{ uri?: string }} */ (destination)?.uri ?? '')
        .trim()
        .toLowerCase();
      if (uri) hosts.push(uri);
    }
  }
  return hosts;
}

/**
 * @param {unknown} app
 */
function appName(app) {
  return String(/** @type {{ name?: string }} */ (app)?.name ?? '').trim();
}

/** @type {unknown[]} */
const apps = await cfGet(`/accounts/${accountId}/access/apps?per_page=100`);

/** @type {Record<string, unknown> | null} */
let pagesApp = null;
/** @type {Record<string, unknown> | null} */
let workerApp = null;

for (const app of apps) {
  const name = appName(app).toLowerCase();
  const hosts = appHostnames(app);
  if (!pagesApp && hosts.some((host) => host === pagesHost || host.endsWith(pagesHost))) {
    pagesApp = /** @type {Record<string, unknown>} */ (app);
  }
  if (
    workerName &&
    !workerApp &&
    (name.includes(workerName) || hosts.some((host) => host.includes(workerName)))
  ) {
    workerApp = /** @type {Record<string, unknown>} */ (app);
  }
}

if (!workerApp && workerName) {
  for (const app of apps) {
    const name = appName(app).toLowerCase();
    if (name.includes('worker') && (name.includes('production') || name.includes('lovely home'))) {
      workerApp = /** @type {Record<string, unknown>} */ (app);
      break;
    }
  }
}

const result = {
  access_pages_app_id: String(pagesApp?.id ?? ''),
  access_worker_app_id: String(workerApp?.id ?? ''),
  access_pages_app_name: appName(pagesApp),
  access_worker_app_name: appName(workerApp)
};

console.log(JSON.stringify(result, null, 2));

if (!result.access_pages_app_id || !result.access_worker_app_id) {
  console.error('\nCould not resolve both Pages and Worker Access app IDs. Check Zero Trust → Access → Applications.');
  process.exit(1);
}
