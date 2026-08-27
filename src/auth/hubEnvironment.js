/** @typedef {string} HubEnvironmentId */

const RUNTIME_CONFIG_PATH = './runtime-config.json';

/** Valid Wrangler / platform hub environment ids (same rules as site ids). */
const SITE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;

/** Environments that use vanilla/isolated defaults (no production home data). */
/** @type {ReadonlySet<string>} */
export const VANILLA_HUB_ENVIRONMENTS = new Set(['test', 'staging', 'sandbox']);

/** @type {HubEnvironmentId | null} */
let resolvedEnvironment = null;

/** @type {Promise<HubEnvironmentId> | null} */
let resolvePromise = null;

/**
 * @param {unknown} value
 * @returns {HubEnvironmentId | null}
 */
function normalizeHubEnvironment(value) {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'staging') return 'staging';
  if (raw === 'test') return 'test';
  if (raw === 'sandbox') return 'sandbox';
  if (SITE_ID_RE.test(raw)) return raw;
  return null;
}

/**
 * @returns {HubEnvironmentId | null}
 */
function readBuildTimeHubEnvironment() {
  return normalizeHubEnvironment(import.meta.env.VITE_HUB_ENVIRONMENT);
}

/**
 * @param {string} host
 * @returns {HubEnvironmentId | null}
 */
function hubEnvironmentFromHostname(host) {
  const hostname = host.toLowerCase();
  if (hostname === 'dashboard.lovely-home.co.uk') return 'production';
  const zoneSuffix = '.lovely-home.co.uk';
  if (hostname.endsWith(zoneSuffix)) {
    const sub = hostname.slice(0, -zoneSuffix.length);
    if (sub && SITE_ID_RE.test(sub)) return sub;
  }
  const customerZoneSuffix = '.lovely-hub.com';
  if (hostname.endsWith(customerZoneSuffix)) {
    const sub = hostname.slice(0, -customerZoneSuffix.length);
    if (sub && SITE_ID_RE.test(sub)) return sub;
  }
  if (hostname.includes('home-dashboard-test')) return 'test';
  if (hostname.includes('home-dashboard-sandbox')) return 'sandbox';
  const pagesMatch = hostname.match(/home-dashboard-([a-z][a-z0-9_-]{0,31})/);
  if (pagesMatch) return pagesMatch[1];
  return null;
}

/**
 * @returns {HubEnvironmentId | null}
 */
function readHostnameHubEnvironment() {
  if (typeof location === 'undefined') return null;
  return hubEnvironmentFromHostname(location.hostname);
}

/**
 * @returns {HubEnvironmentId}
 */
export function getHubEnvironmentSync() {
  if (resolvedEnvironment) return resolvedEnvironment;
  return readBuildTimeHubEnvironment() ?? readHostnameHubEnvironment() ?? 'production';
}

/**
 * @returns {Promise<HubEnvironmentId>}
 */
export async function ensureHubEnvironment() {
  if (resolvedEnvironment) return resolvedEnvironment;
  if (resolvePromise) return resolvePromise;

  resolvePromise = (async () => {
    const fromBuild = readBuildTimeHubEnvironment();
    if (fromBuild) {
      resolvedEnvironment = fromBuild;
      return fromBuild;
    }

    try {
      const response = await fetch(RUNTIME_CONFIG_PATH, { cache: 'no-store' });
      if (response.ok) {
        const json = await response.json();
        const fromRuntime = normalizeHubEnvironment(json?.hubEnvironment);
        if (fromRuntime) {
          resolvedEnvironment = fromRuntime;
          return fromRuntime;
        }
      }
    } catch {
      /* offline or missing file */
    }

    resolvedEnvironment = readHostnameHubEnvironment() ?? 'production';
    return resolvedEnvironment;
  })();

  return resolvePromise;
}

/**
 * True for non-production hub stacks — isolated vanilla defaults.
 * Platform sites use their site id as hub_environment (e.g. demo, sandbox).
 * @returns {boolean}
 */
export function isVanillaHubEnvironment() {
  return getHubEnvironmentSync() !== 'production';
}

/** Public demo hub at demo.lovely-home.co.uk. */
export function isDemoHubEnvironment() {
  return getHubEnvironmentSync() === 'demo';
}

/** @deprecated Prefer isVanillaHubEnvironment */
export function isTestHubEnvironment() {
  return isVanillaHubEnvironment();
}

/** @internal */
export function resetHubEnvironmentForTests() {
  resolvedEnvironment = null;
  resolvePromise = null;
}
