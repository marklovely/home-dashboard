/**
 * getAddress.io — UK UPRN resolution for ukbinday import.
 * @see https://documentation.getaddress.io/
 */

/**
 * @param {string | undefined} raw
 */
export function normalizeGetAddressApiKey(raw) {
  let value = String(raw ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .trim();
  while (/^["']/.test(value) || /["']$/.test(value)) {
    value = value.replace(/^["']+|["']+$/g, '');
  }
  return value;
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
