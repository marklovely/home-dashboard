/**
 * Loads optional house-specific values from private-content.local.json (gitignored).
 * Falls back safely when values are absent — never show undefined or broken UI.
 */

/** @type {Record<string, unknown> | null} */
let cached = null;

const PLACEHOLDER_CONTACT =
  'Contact details will be available once secure house-sitter access is enabled.';
const PLACEHOLDER_WIFI =
  'Wi-Fi details will be available once secure house-sitter access is enabled.';
const PLACEHOLDER_LOCKBOX =
  'Lockbox access will be available once secure house-sitter access is enabled.';
const PLACEHOLDER_ADDRESS =
  'Full address details will be available once secure house-sitter access is enabled.';

/**
 * @param {Record<string, unknown>} root
 * @param {string} path
 * @returns {unknown}
 */
function getByPath(root, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return /** @type {Record<string, unknown>} */ (acc)[key];
    }
    return undefined;
  }, /** @type {unknown} */ (root));
}

/**
 * Attempt to load local private content (Vite glob, optional file).
 */
function loadPrivateContent() {
  if (cached !== null) return cached;
  cached = {};
  const modules = import.meta.glob('../private-content.local.json', { eager: true });
  const entry = modules['../private-content.local.json'];
  if (entry && typeof entry === 'object' && 'default' in entry) {
    cached = /** @type {Record<string, unknown>} */ (entry.default);
  }
  return cached;
}

/**
 * @param {string} key Dot path, e.g. wifi.password
 * @returns {string | undefined}
 */
export function getProtectedString(key) {
  const value = getByPath(loadPrivateContent() ?? {}, key);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

/**
 * @param {string} key
 * @param {'contact' | 'wifi' | 'lockbox' | 'address' | 'generic'} kind
 */
export function getProtectedDisplayValue(key, kind = 'generic') {
  const resolved = getProtectedString(key);
  if (resolved) return resolved;
  if (kind === 'wifi') return PLACEHOLDER_WIFI;
  if (kind === 'lockbox') return PLACEHOLDER_LOCKBOX;
  if (kind === 'address') return PLACEHOLDER_ADDRESS;
  if (kind === 'contact') return PLACEHOLDER_CONTACT;
  return PLACEHOLDER_CONTACT;
}

export function hasProtectedValue(key) {
  return Boolean(getProtectedString(key));
}

export function getWifiDetailsForPanel() {
  const ssid = getProtectedString('wifi.ssid');
  const password = getProtectedString('wifi.password');
  if (ssid && password) {
    return [
      { label: 'Network name', value: ssid },
      { label: 'Password', value: password }
    ];
  }
  return [{ label: 'Wi-Fi', value: PLACEHOLDER_WIFI }];
}
