import { getApiBaseUrl } from '../api/apiBase.js';

/**
 * @param {string} expected
 * @param {string} actual
 */
function constantTimeEqual(expected, actual) {
  if (expected.length !== actual.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  }
  return mismatch === 0;
}

export function isOwnerPinConfiguredAtBuild() {
  return Boolean(String(import.meta.env.VITE_OWNER_PIN ?? '').trim());
}

function configuredLocalPin() {
  return String(import.meta.env.VITE_OWNER_PIN ?? '').trim();
}

/**
 * @param {string} pin
 */
function validateLocalOwnerPin(pin) {
  const configured = configuredLocalPin();
  if (!configured) return false;
  return constantTimeEqual(configured, pin.trim());
}

/**
 * @param {string} pin
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<'not_implemented' | boolean>}
 */
async function validateOwnerPinViaWorker(pin, fetchImpl = fetch) {
  const base = getApiBaseUrl();
  if (!base) return 'not_implemented';

  try {
    const response = await fetchImpl(`${base}/api/auth/owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin.trim() }),
      cache: 'no-store'
    });
    if (response.status === 501 || response.status === 404) return 'not_implemented';
    if (response.ok) return true;
    if (response.status === 401 || response.status === 403) return false;
    return 'not_implemented';
  } catch {
    return 'not_implemented';
  }
}

/**
 * @param {string} pin
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<boolean>}
 */
export async function validateOwnerPin(pin, fetchImpl) {
  if (isOwnerPinConfiguredAtBuild()) {
    return validateLocalOwnerPin(pin);
  }

  const remote = await validateOwnerPinViaWorker(pin, fetchImpl);
  if (remote === true) return true;
  if (remote === false) return false;
  return validateLocalOwnerPin(pin);
}

export const OwnerAuthProvider = {
  validatePin: validateOwnerPin,
  isPinConfigured: isOwnerPinConfiguredAtBuild
};
