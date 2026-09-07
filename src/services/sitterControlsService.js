import { fetchHouseSettings, postSitterControlsEnabled } from '../api/houseSettingsApi.js';

/** @type {boolean | null} */
let sitterControlsManual = null;

/** @type {boolean | null} */
let sitterControlsDisclosed = null;

/** @type {Set<() => void>} */
const listeners = new Set();

/** @param {() => void} listener */
export function subscribeToSitterControls(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getSitterControlsManual() {
  return sitterControlsManual;
}

export function isSitterControlsDisclosed() {
  return sitterControlsDisclosed === true;
}

/**
 * @param {import('../api/houseSettingsApi.js').HouseSettingsPayload} payload
 */
export function applySitterControlsFromPayload(payload) {
  if (payload.sitterControlsManual !== undefined) {
    applySitterControlsManual(payload.sitterControlsManual);
  }
  if (payload.sitterControlsDisclosed !== undefined) {
    applySitterControlsEffective(payload.sitterControlsDisclosed);
  }
}

/**
 * @param {boolean | null | undefined} value
 */
export function applySitterControlsManual(value) {
  if (value == null) return;
  const next = value === true;
  if (sitterControlsManual === next) return;
  sitterControlsManual = next;
  notify();
}

/**
 * @param {boolean | null | undefined} value
 */
export function applySitterControlsEffective(value) {
  if (value == null) return;
  const next = value === true;
  if (sitterControlsDisclosed === next) return;
  sitterControlsDisclosed = next;
  notify();
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function syncSitterControlsFromServer(fetchImpl = fetch) {
  const result = await fetchHouseSettings(fetchImpl);
  if (!result.ok) {
    return false;
  }
  applySitterControlsFromPayload(result.data);
  return true;
}

/**
 * @param {boolean} enabled
 * @param {typeof fetch} [fetchImpl]
 */
export async function setSitterControlsEnabled(enabled, fetchImpl = fetch) {
  const result = await postSitterControlsEnabled(enabled, fetchImpl);
  if (!result.ok) {
    return false;
  }
  applySitterControlsFromPayload(result.data);
  return true;
}

/** @internal */
export function resetSitterControlsForTests() {
  sitterControlsManual = null;
  sitterControlsDisclosed = null;
  listeners.clear();
}
