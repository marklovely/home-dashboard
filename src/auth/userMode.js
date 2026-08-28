import {
  getDeploymentDefaultUserMode,
  isHomeDeployment,
  isHouseSitterDeployment
} from './deploymentMode.js';
import { clearOwnerPinSession } from './ownerSession.js';
import { isDemoHubEnvironment } from './hubEnvironment.js';
import {
  clearPersistedUiViewingMode,
  persistUiViewingMode,
  resolveUiViewingModeForDeviceSession
} from './uiViewingModePreference.js';

/** @typedef {'owner' | 'house-sitter'} UserModeId */

export const UserMode = /** @type {const} */ ({
  Owner: 'owner',
  HouseSitter: 'house-sitter'
});

/** @type {UserModeId} */
let currentUserMode = getDeploymentDefaultUserMode();

/** @type {Set<() => void>} */
const listeners = new Set();

/** @param {() => void} listener */
export function subscribeToUserMode(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyUserModeChange() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @returns {UserModeId}
 */
export function getUserMode() {
  return currentUserMode;
}

export function isOwnerUserMode() {
  return currentUserMode === UserMode.Owner;
}

export function isHouseSitterExperience() {
  return currentUserMode === UserMode.HouseSitter;
}

/** @deprecated Use isHouseSitterExperience */
export function isHouseSitterMode() {
  return isHouseSitterExperience();
}

/**
 * @param {'owner' | 'sitter'} serverMode
 */
export function applyDeviceSessionMode(serverMode) {
  if (serverMode === 'sitter' && !isDemoHubEnvironment()) {
    clearPersistedUiViewingMode();
  }

  const mapped = resolveUiViewingModeForDeviceSession(serverMode);
  if (currentUserMode === mapped) return;
  currentUserMode = mapped;
  if (mapped === UserMode.HouseSitter) {
    clearOwnerPinSession();
  }
  notifyUserModeChange();
}

/**
 * @param {UserModeId} mode
 * @param {{ skipPersist?: boolean }} [options]
 * @returns {boolean}
 */
export function setUserMode(mode, options = {}) {
  if (isHouseSitterDeployment() && mode === UserMode.Owner) {
    return false;
  }
  if (currentUserMode === mode) return true;
  currentUserMode = mode;
  if (mode === UserMode.HouseSitter) {
    clearOwnerPinSession();
  }
  if (!options.skipPersist && isHomeDeployment()) {
    persistUiViewingMode(mode);
  }
  notifyUserModeChange();
  return true;
}

export function resetUserModeToDeploymentDefault() {
  currentUserMode = getDeploymentDefaultUserMode();
  clearOwnerPinSession();
  notifyUserModeChange();
}

/** @internal */
export function resetUserModeForTests() {
  currentUserMode = getDeploymentDefaultUserMode();
  clearOwnerPinSession();
  listeners.clear();
}

export { isHomeDeployment, isHouseSitterDeployment };
