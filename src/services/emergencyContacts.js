import { getPrivateConfigValue } from '../services/privateConfigService.js';

/**
 * @param {string} key
 */
export function resolveContactPhone(key) {
  const value = getPrivateConfigValue(key);
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim();
}

/**
 * @param {string} phone
 */
export function phoneHref(phone) {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}
