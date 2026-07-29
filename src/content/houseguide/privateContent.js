/**
 * Protected values: Worker API (production) with optional local JSON override for development.
 */
import {
  getPrivateConfigStatus,
  getPrivateConfigValue,
  isPrivateConfigLoading,
  preloadPrivateConfig
} from '../../services/privateConfigService.js';

const PLACEHOLDER_CONTACT =
  'Contact details will be available once secure house-sitter access is enabled.';
const PLACEHOLDER_WIFI =
  'Wi-Fi details will be available once secure house-sitter access is enabled.';
const PLACEHOLDER_LOCKBOX =
  'Lockbox access will be available once secure house-sitter access is enabled.';
const PLACEHOLDER_ADDRESS =
  'Full address details will be available once secure house-sitter access is enabled.';
const PLACEHOLDER_LOADING = 'Loading secure details…';

/**
 * @param {string} key Dot path, e.g. wifi.password
 * @returns {string | undefined}
 */
export function getProtectedString(key) {
  const value = getPrivateConfigValue(key);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

/**
 * @param {string} key
 * @param {'contact' | 'wifi' | 'lockbox' | 'address' | 'generic'} kind
 */
export function getProtectedDisplayValue(key, kind = 'generic') {
  if (isPrivateConfigLoading()) return PLACEHOLDER_LOADING;

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
  if (isPrivateConfigLoading()) {
    return [{ label: 'Wi-Fi', value: PLACEHOLDER_LOADING }];
  }
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

export { preloadPrivateConfig, getPrivateConfigStatus };
