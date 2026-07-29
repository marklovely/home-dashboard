const RUNTIME_CONFIG_PATH = './runtime-config.json';

/** @type {string | null} */
let runtimeResolvedBase = null;

/** @type {Promise<string> | null} */
let resolvePromise = null;

/**
 * @param {unknown} value
 * @returns {string}
 */
function trimBaseUrl(value) {
  return String(value ?? '')
    .trim()
    .replace(/\/$/, '');
}

function readBuildTimeBaseUrl() {
  return trimBaseUrl(import.meta.env.VITE_API_BASE_URL);
}

/**
 * Hosted dashboard on Pages/custom domain uses the same-origin /api proxy.
 * @returns {boolean}
 */
function shouldUsePagesApiProxy() {
  if (typeof globalThis.location === 'undefined') return false;
  const host = globalThis.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  if (host.endsWith('.pages.dev')) return true;
  return host === 'dashboard.lovely-home.co.uk';
}

/**
 * @returns {string}
 */
export function getApiBaseUrl() {
  const fromEnv = readBuildTimeBaseUrl();
  if (fromEnv) return fromEnv;
  return runtimeResolvedBase ?? '';
}

/**
 * Absolute Worker URL or same-origin path when using the Pages `/api` proxy.
 * @param {string} path Must start with `/api/` (e.g. `/api/weather`).
 * @returns {string}
 */
export function buildApiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (shouldUsePagesApiProxy()) return normalized;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

export function isApiConfigured() {
  if (readBuildTimeBaseUrl()) return true;
  if (runtimeResolvedBase) return true;
  return true;
}

/**
 * Resolves API base from build-time env or `./runtime-config.json` (written at build).
 * @returns {Promise<string>}
 */
export async function ensureApiBaseUrl() {
  const fromEnv = readBuildTimeBaseUrl();
  if (fromEnv) return fromEnv;
  if (runtimeResolvedBase) return runtimeResolvedBase;
  if (!resolvePromise) {
    resolvePromise = (async () => {
      try {
        const response = await fetch(RUNTIME_CONFIG_PATH, { cache: 'no-store' });
        if (response.ok) {
          const json = await response.json();
          const url = trimBaseUrl(json?.apiBaseUrl);
          if (url) runtimeResolvedBase = url;
        }
      } catch {
        // offline or missing file
      }
      return getApiBaseUrl();
    })();
  }
  return resolvePromise;
}

/** @internal test helper */
export function resetApiBaseForTests() {
  runtimeResolvedBase = null;
  resolvePromise = null;
}
