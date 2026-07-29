import { ensureApiBaseUrl, buildApiUrl } from './apiBase.js';
import { resolveApiClient } from './client.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @typedef {Object} WorkerPrivateConfig
 * @property {{ ssid?: string, password?: string }} [wifi]
 * @property {Record<string, { name?: string, phone?: string, email?: string }>} [contacts]
 * @property {{ address?: string }} [home]
 */

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<WorkerPrivateConfig | null>}
 */
export async function fetchPrivateConfigFromApi(fetchImpl) {
  await ensureApiBaseUrl();
  const client = resolveApiClient(fetchImpl);
  const response = await client.get(buildApiUrl('/api/private-config'), withApiCredentials({ cache: 'no-store' }));
  if (!response.ok) return null;
  return /** @type {WorkerPrivateConfig} */ (await response.json());
}
