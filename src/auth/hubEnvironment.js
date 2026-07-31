/** @typedef {'production' | 'test'} HubEnvironmentId */

const RUNTIME_CONFIG_PATH = './runtime-config.json';

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
  if (raw === 'test' || raw === 'staging') return 'test';
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
 * @returns {HubEnvironmentId | null}
 */
function readHostnameHubEnvironment() {
  if (typeof location === 'undefined') return null;
  const host = location.hostname.toLowerCase();
  if (host === 'test.lovely-home.co.uk') return 'test';
  if (host.includes('home-dashboard-test')) return 'test';
  return null;
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

export function isTestHubEnvironment() {
  return getHubEnvironmentSync() === 'test';
}

/** @internal */
export function resetHubEnvironmentForTests() {
  resolvedEnvironment = null;
  resolvePromise = null;
}
