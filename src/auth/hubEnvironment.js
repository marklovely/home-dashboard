/** @typedef {'production' | 'test' | 'sandbox' | 'staging'} HubEnvironmentId */

const RUNTIME_CONFIG_PATH = './runtime-config.json';

/** Environments that use vanilla/isolated defaults (no production home data). */
/** @type {ReadonlySet<HubEnvironmentId>} */
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
  if (raw === 'staging') return 'staging';
  if (raw === 'test') return 'test';
  if (raw === 'sandbox') return 'sandbox';
  if (raw === 'production' || raw === 'prod') return 'production';
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
  if (hostname === 'test.lovely-home.co.uk') return 'test';
  if (hostname === 'sandbox.lovely-home.co.uk') return 'sandbox';
  if (hostname.includes('home-dashboard-test')) return 'test';
  if (hostname.includes('home-dashboard-sandbox')) return 'sandbox';
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
 * True for trial/sandbox stacks (test, sandbox, staging) — isolated vanilla defaults.
 * @returns {boolean}
 */
export function isVanillaHubEnvironment() {
  return VANILLA_HUB_ENVIRONMENTS.has(getHubEnvironmentSync());
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
