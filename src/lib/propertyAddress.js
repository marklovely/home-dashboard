/** @typedef {{
 *   line1?: string,
 *   line2?: string,
 *   line3?: string,
 *   city?: string,
 *   county?: string,
 *   country?: string,
 *   postcode?: string
 * }} PropertyAddress
 */

export const EMPTY_PROPERTY_ADDRESS = Object.freeze({
  line1: '',
  line2: '',
  line3: '',
  city: '',
  county: '',
  country: '',
  postcode: ''
});

/**
 * @param {unknown} value
 * @returns {PropertyAddress}
 */
export function normalizePropertyAddress(value) {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_PROPERTY_ADDRESS };
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  return {
    line1: String(record.line1 ?? '').trim(),
    line2: String(record.line2 ?? '').trim(),
    line3: String(record.line3 ?? '').trim(),
    city: String(record.city ?? '').trim(),
    county: String(record.county ?? '').trim(),
    country: String(record.country ?? '').trim(),
    postcode: String(record.postcode ?? '').trim()
  };
}

/**
 * @param {PropertyAddress | Record<string, unknown> | null | undefined} address
 */
export function formatPropertyAddress(address) {
  const normalized = normalizePropertyAddress(address);
  return [
    normalized.line1,
    normalized.line2,
    normalized.line3,
    normalized.city,
    normalized.county,
    normalized.country,
    normalized.postcode
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {PropertyAddress | Record<string, unknown> | null | undefined} address
 */
export function hasPropertyAddress(address) {
  return Boolean(formatPropertyAddress(address));
}

/**
 * Best-effort parse for legacy single secret strings.
 *
 * @param {string | null | undefined} text
 * @returns {PropertyAddress}
 */
export function parsePropertyAddressFromString(text) {
  const lines = String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ...EMPTY_PROPERTY_ADDRESS };
  if (lines.length === 1) {
    return { ...EMPTY_PROPERTY_ADDRESS, line1: lines[0] };
  }
  return normalizePropertyAddress({
    line1: lines[0] ?? '',
    line2: lines[1] ?? '',
    line3: lines[2] ?? '',
    city: lines[3] ?? '',
    county: lines[4] ?? '',
    country: lines[5] ?? '',
    postcode: lines[6] ?? lines.slice(6).join(', ')
  });
}
