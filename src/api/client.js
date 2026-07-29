/**
 * @param {typeof fetch} [fetchImpl]
 */
export function createApiClient(fetchImpl = fetch) {
  return {
    /**
     * @param {string | URL} url
     * @param {RequestInit} [init]
     */
    async get(url, init = {}) {
      return fetchImpl(url, { ...init, method: 'GET' });
    },
    /**
     * @param {string | URL} url
     * @param {RequestInit} [init]
     */
    async post(url, init = {}) {
      return fetchImpl(url, {
        ...init,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers ?? {})
        }
      });
    }
  };
}

/** @type {ReturnType<typeof createApiClient>} */
let defaultClient = createApiClient();

/**
 * @param {typeof fetch} fetchImpl
 */
export function configureApiClient(fetchImpl) {
  defaultClient = createApiClient(fetchImpl);
}

export function getApiClient() {
  return defaultClient;
}

/** @param {typeof fetch} [fetchImpl] */
export function resolveApiClient(fetchImpl) {
  return fetchImpl ? createApiClient(fetchImpl) : defaultClient;
}
