/** @typedef {{ value: string, label: string, flag: string }} HubCountryOption */

/**
 * @param {string} code
 * @returns {string}
 */
export function countryFlagEmoji(code) {
  if (code === 'OTHER') return '🌍';
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '';
  return String.fromCodePoint(
    ...normalized.split('').map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  );
}

/** @type {Omit<HubCountryOption, 'flag'>[]} */
const HUB_COUNTRY_DEFINITIONS = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'AT', label: 'Austria' },
  { value: 'PL', label: 'Poland' },
  { value: 'OTHER', label: 'Other country' }
];

/** @type {HubCountryOption[]} */
export const HUB_COUNTRY_OPTIONS = HUB_COUNTRY_DEFINITIONS.map((entry) => ({
  ...entry,
  flag: countryFlagEmoji(entry.value)
}));

/**
 * @param {HubCountryOption} option
 * @returns {string}
 */
export function hubCountrySelectLabel(option) {
  return option.flag ? `${option.flag} ${option.label}` : option.label;
}

/**
 * @returns {{ value: string, label: string }[]}
 */
export function hubCountrySelectOptions() {
  return HUB_COUNTRY_OPTIONS.map((option) => ({
    value: option.value,
    label: hubCountrySelectLabel(option)
  }));
}

/**
 * @param {string | undefined | null} code
 * @returns {string}
 */
export function hubCountryLabel(code) {
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  const match = HUB_COUNTRY_OPTIONS.find((option) => option.value === normalized);
  return match?.label ?? '';
}

/**
 * @param {string | undefined | null} code
 * @returns {string}
 */
export function normalizeHubCountryCode(code) {
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  if (!normalized) return 'GB';
  if (HUB_COUNTRY_OPTIONS.some((option) => option.value === normalized)) {
    return normalized;
  }
  return 'OTHER';
}

/**
 * @param {string} code
 * @returns {boolean}
 */
export function supportsUkAddressAutocomplete(code) {
  return normalizeHubCountryCode(code) === 'GB';
}
