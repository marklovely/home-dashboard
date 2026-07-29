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
 * @returns {string}
 */
export function getApiBaseUrl() {
  const fromEnv = readBuildTimeBaseUrl();
  if (fromEnv) return fromEnv;
  return runtimeResolvedBase ?? '';
}

/**
 * Production Pages uses same-origin /api (Pages Function → Worker).
 * Local dev uses VITE_API_BASE_URL (wrangler on :8787).
 * @param {string} path Must start with `/api/`.
 * @returns {string}
 */
export function buildApiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!import.meta.env.DEV) {
    return normalized;
  }
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('API not configured');
  }
  return `${base}${normalized}`;
}

export function isApiConfigured() {
  if (!import.meta.env.DEV) return true;
  return Boolean(getApiBaseUrl());
}

/**
 * Resolves API base from build-time env or `./runtime-config.json` (written at build).
 * @returns {Promise<string>}
 */
export async function ensureApiBaseUrl() {
  if (!import.meta.env.DEV) return '';
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
