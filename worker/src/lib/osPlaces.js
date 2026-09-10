/**
 * Ordnance Survey Places API — UK UPRN resolution for ukbinday import.
 * @see https://docs.os.uk/os-apis/accessing-os-apis/os-places-api
 */

export const OS_PLACES_API_BASE = 'https://api.os.uk/search/places/v1';

/**
 * @param {string | undefined} raw
 */
export function normalizeOsPlacesApiKey(raw) {
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
export function resolveOsPlacesConfig(env) {
  const apiKey = normalizeOsPlacesApiKey(env.OS_PLACES_API_KEY);
  return {
    configured: Boolean(apiKey),
    apiKey
  };
}
