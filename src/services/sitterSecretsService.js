import { fetchHouseSettings, postSitterSecretsDisclosed } from '../api/houseSettingsApi.js';
import { applySitterAccessEmails } from './sitterAccessEmailsService.js';
import { refreshPrivateConfig } from './privateConfigService.js';

/** @type {boolean | null} */
let sitterSecretsManual = null;

/** @type {boolean | null} */
let sitterSecretsDisclosed = null;

/** @type {Set<() => void>} */
const listeners = new Set();

/** @param {() => void} listener */
export function subscribeToSitterSecrets(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getSitterSecretsManual() {
  return sitterSecretsManual;
}

export function getSitterSecretsDisclosed() {
  return sitterSecretsDisclosed;
}

export function isSitterSecretsDisclosed() {
  return sitterSecretsDisclosed === true;
}

/**
 * @param {import('../api/houseSettingsApi.js').HouseSettingsPayload} payload
 */
export function applySitterSecretsFromPayload(payload) {
  if (payload.sitterSecretsManual !== undefined) {
    applySitterSecretsManual(payload.sitterSecretsManual);
  }
  if (payload.sitterSecretsDisclosed !== undefined) {
    applySitterSecretsEffective(payload.sitterSecretsDisclosed);
  }
}

/**
 * @param {boolean | null | undefined} value
 */
export function applySitterSecretsManual(value) {
  if (value == null) return;
  const next = value === true;
  if (sitterSecretsManual === next) return;
  sitterSecretsManual = next;
  notify();
}

/**
 * @param {boolean | null | undefined} value
 */
export function applySitterSecretsEffective(value) {
  if (value == null) return;
  const next = value === true;
  if (sitterSecretsDisclosed === next) return;
  sitterSecretsDisclosed = next;
  notify();
  void refreshPrivateConfig();
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function syncSitterSecretsFromServer(fetchImpl = fetch) {
  const result = await fetchHouseSettings(fetchImpl);
  if (!result.ok) {
    return false;
  }
  applySitterSecretsFromPayload(result.data);
  applySitterAccessEmails(
    result.data.sitterAccessEmailsManual ?? result.data.sitterAccessEmails,
    result.data.accessSitterSyncConfigured
  );
  return true;
}

/**
 * @param {boolean} disclosed
 * @param {typeof fetch} [fetchImpl]
 */
export async function setSitterSecretsDisclosed(disclosed, fetchImpl = fetch) {
  const result = await postSitterSecretsDisclosed(disclosed, fetchImpl);
  if (!result.ok) {
    return false;
  }
  applySitterSecretsFromPayload(result.data);
  return true;
}

/** @internal */
export function resetSitterSecretsForTests() {
  sitterSecretsManual = null;
  sitterSecretsDisclosed = null;
  listeners.clear();
}
