import { pressButtonById } from './buttonApi.js';

/**
 * @param {Object} params
 * @param {number} params.buttonId
 * @param {typeof fetch} [params.fetchImpl]
 */
export async function triggerVirtualButton({ buttonId, fetchImpl }) {
  if (!navigator.onLine) {
    throw new Error('You are offline');
  }
  return pressButtonById(buttonId, fetchImpl);
}

/** @deprecated Access codes are server-side only */
export function buildVirtualButtonUrl() {
  throw new Error('Virtual Buttons URLs are not constructed in the browser.');
}
