import { fetchPrivateConfigFromApi } from '../api/privateConfigApi.js';
import { ensureApiBaseUrl, isApiConfigured } from '../api/apiBase.js';

/** @type {'idle' | 'loading' | 'loaded' | 'error'} */
let status = 'idle';

/** @type {Record<string, unknown> | null} */
let sessionCache = null;

/** @type {Promise<void> | null} */
let inflight = null;

/**
 * @param {import('../api/privateConfigApi.js').WorkerPrivateConfig | null} payload
 */
function workerPayloadToNested(payload) {
  if (!payload) return {};
  return {
    wifi: payload.wifi ?? {},
    contacts: payload.contacts ?? {},
    address: payload.home?.address ? { full: payload.home.address } : {}
  };
}

/**
 * @returns {Record<string, unknown>}
 */
function loadLocalPrivateContent() {
  const modules = import.meta.glob('../content/houseguide/private-content.local.json', { eager: true });
  const entry = modules['../content/houseguide/private-content.local.json'];
  if (entry && typeof entry === 'object' && 'default' in entry) {
    return /** @type {Record<string, unknown>} */ ({ ...entry.default });
  }
  return {};
}

/**
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>} source
 */
function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const existing = target[key];
      if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        deepMerge(/** @type {Record<string, unknown>} */ (existing), /** @type {Record<string, unknown>} */ (value));
      } else {
        target[key] = { .../** @type {Record<string, unknown>} */ (value) };
      }
    } else if (value !== undefined) {
      target[key] = value;
    }
  }
  return target;
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function preloadPrivateConfig(fetchImpl) {
  if (status === 'loaded' || status === 'error') return;
  if (inflight) return inflight;

  inflight = (async () => {
    status = 'loading';
    const merged = loadLocalPrivateContent();
    await ensureApiBaseUrl();
    if (isApiConfigured()) {
      try {
        const payload = await fetchPrivateConfigFromApi(fetchImpl);
        deepMerge(merged, workerPayloadToNested(payload));
        status = 'loaded';
      } catch (error) {
        console.error(error);
        status = 'error';
      }
    } else {
      status = 'loaded';
    }
    sessionCache = merged;
    inflight = null;
  })();

  return inflight;
}

/**
 * @returns {Record<string, unknown>}
 */
function getSessionRoot() {
  if (sessionCache === null) {
    sessionCache = loadLocalPrivateContent();
    if (status === 'idle') status = 'loaded';
  }
  return sessionCache;
}

/**
 * @param {string} path
 */
export function getPrivateConfigValue(path) {
  const root = getSessionRoot();
  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return /** @type {Record<string, unknown>} */ (acc)[key];
    }
    return undefined;
  }, /** @type {unknown} */ (root));
}

export function getPrivateConfigStatus() {
  return status;
}

export function isPrivateConfigLoading() {
  return status === 'loading';
}

/** Clears cached owner-only config from memory. */
export function clearPrivateConfigSession() {
  status = 'idle';
  sessionCache = null;
  inflight = null;
}

/**
 * Reload private config after sitter secret sharing changes.
 * @param {typeof fetch} [fetchImpl]
 */
export async function refreshPrivateConfig(fetchImpl) {
  clearPrivateConfigSession();
  await preloadPrivateConfig(fetchImpl);
}

/** Test helper */
export function resetPrivateConfigForTests() {
  status = 'idle';
  sessionCache = null;
  inflight = null;
}
