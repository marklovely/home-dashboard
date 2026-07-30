import {
  getDeploymentDefaultUserMode,
  isHomeDeployment,
  isHouseSitterDeployment
} from './deploymentMode.js';
import { clearOwnerPinSession } from './ownerSession.js';

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
  const mapped = serverMode === 'owner' ? UserMode.Owner : UserMode.HouseSitter;
  if (currentUserMode === mapped) return;
  currentUserMode = mapped;
  if (mapped === UserMode.HouseSitter) {
    clearOwnerPinSession();
  }
  notifyUserModeChange();
}

/**
 * @param {UserModeId} mode
 * @returns {boolean}
 */
export function setUserMode(mode) {
  if (isHouseSitterDeployment() && mode === UserMode.Owner) {
    return false;
  }
  if (currentUserMode === mode) return true;
  currentUserMode = mode;
  if (mode === UserMode.HouseSitter) {
    clearOwnerPinSession();
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
