/**
 * getAddress.io — UK UPRN resolution for ukbinday import.
 * @see https://documentation.getaddress.io/
 */

/**
 * @param {string | undefined} raw
 */
export function normalizeGetAddressApiKey(raw) {
  return String(raw ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function resolveGetAddressConfig(env) {
  const apiKey = normalizeGetAddressApiKey(env.GETADDRESS_API_KEY);
  return {
    configured: Boolean(apiKey),
    apiKey
  };
}
