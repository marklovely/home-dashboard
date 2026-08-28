import {
  fetchDeviceSession,
  postEnterSitterMode,
  postLockOwner
} from '../api/deviceSessionApi.js';
import { applyDeviceSessionMode, isOwnerUserMode } from './userMode.js';
import { setActiveProfileId } from '../services/profileService.js';
import { ownerAuthProvider } from './OwnerAuthProvider.js';
import { completeOwnerUnlock, lockToHouseSitterMode } from './ownerLock.js';
import { clearMyDayCalendarState } from '../services/myDayCalendarService.js';
import { clearPrivateConfigSession, refreshPrivateConfig } from '../services/privateConfigService.js';
import { applySitterSecretsEffective } from '../services/sitterSecretsService.js';
import { applyPublicHubBranding } from '../services/siteProfileService.js';
import { clearApplianceManualsState } from '../services/applianceManualsService.js';
import { clearOwnerAccessToken } from './ownerAccessToken.js';

/** @typedef {'loading' | 'ready' | 'error'} DeviceSessionStatus */

/** @typedef {'owner' | 'sitter'} DeviceMode */

/** @type {DeviceSessionStatus} */
let status = 'loading';

/** @type {DeviceMode} */
let mode = 'owner';

/** @type {string | null} */
let ownerSessionExpiresAt = null;

/** @type {Set<() => void>} */
const listeners = new Set();

const LAST_DEVICE_MODE_KEY = 'lovely_home_last_device_mode';

function persistLastKnownMode() {
  if (mode === 'sitter') {
    sessionStorage.setItem(LAST_DEVICE_MODE_KEY, 'sitter');
  } else {
    sessionStorage.removeItem(LAST_DEVICE_MODE_KEY);
  }
}

export function wasHouseSitterBeforeAccessChallenge() {
  return sessionStorage.getItem(LAST_DEVICE_MODE_KEY) === 'sitter';
}

/** @param {() => void} listener */
export function subscribeToDeviceSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getDeviceSessionStatus() {
  return status;
}

export function getDeviceMode() {
  return mode;
}

export function getOwnerSessionExpiresAt() {
  return ownerSessionExpiresAt;
}

/**
 * @param {{ mode: DeviceMode, ownerSessionExpiresAt?: string | null, hubName?: string }} payload
 */
function applyServerSession(payload) {
  mode = payload.mode === 'owner' ? 'owner' : 'sitter';
  ownerSessionExpiresAt = payload.ownerSessionExpiresAt ?? null;
  applySitterSecretsEffective(payload.sitterSecretsDisclosed);
  applyPublicHubBranding(payload.hubName);
  applyDeviceSessionMode(mode);
  setActiveProfileId(isOwnerUserMode() ? 'owner' : 'housesitter');
  status = 'ready';
  persistLastKnownMode();
  notify();
}

/**
 * @param {typeof fetch} fetchImpl
 */
async function verifyPersistedSitterSession(fetchImpl) {
  const verified = await refreshSession(fetchImpl);
  return verified && mode === 'sitter';
}

export function clearOwnerOnlyClientData() {
  clearMyDayCalendarState();
  clearPrivateConfigSession();
  clearApplianceManualsState();
  clearOwnerAccessToken();
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function refreshSession(fetchImpl = fetch) {
  const result = await fetchDeviceSession(fetchImpl);
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      status = 'error';
      notify();
      return false;
    }
    applyServerSession({ mode: 'owner', ownerSessionExpiresAt: null });
    status = result.status >= 500 ? 'error' : 'ready';
    notify();
    return false;
  }
  applyServerSession(result.data);
  return true;
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function bootstrapDeviceSession(fetchImpl = fetch) {
  status = 'loading';
  notify();
  await refreshSession(fetchImpl);
}

/**
 * @param {string} pin
 * @param {typeof fetch} [fetchImpl]
 * @param {() => void} [onUnlocked]
 */
export async function unlockOwner(pin, fetchImpl = fetch, onUnlocked) {
  const auth = await ownerAuthProvider.authenticate(pin, fetchImpl);
  if (auth.status === 'access_required') {
    return 'access_required';
  }
  if (auth.status !== 'success') {
    return auth.status;
  }
  if (auth.session?.mode === 'owner') {
    applyServerSession({
      mode: 'owner',
      ownerSessionExpiresAt: auth.session.ownerSessionExpiresAt ?? null
    });
    completeOwnerUnlock(onUnlocked);
    return 'success';
  }
  await refreshSession(fetchImpl);
  if (mode !== 'owner') {
    return 'unavailable';
  }
  completeOwnerUnlock(onUnlocked);
  return 'success';
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function enterSitterMode(afterSitter, fetchImpl = fetch) {
  const result = await postEnterSitterMode(fetchImpl);
  if (!result.ok) {
    return { ok: false, code: result.code ?? '' };
  }
  if (!(await verifyPersistedSitterSession(fetchImpl))) {
    status = 'error';
    notify();
    return { ok: false, code: 'SESSION_NOT_PERSISTED' };
  }
  clearOwnerOnlyClientData();
  await refreshPrivateConfig(fetchImpl);
  lockToHouseSitterMode(afterSitter);
  return { ok: true };
}

/**
 * @param {() => void} [afterSitter]
 * @param {typeof fetch} [fetchImpl]
 */
export async function lockOwner(afterSitter, fetchImpl = fetch) {
  const result = await postLockOwner(fetchImpl);
  if (!result.ok) {
    return { ok: false, code: result.code ?? '' };
  }
  if (!(await verifyPersistedSitterSession(fetchImpl))) {
    status = 'error';
    notify();
    return { ok: false, code: 'SESSION_NOT_PERSISTED' };
  }
  clearOwnerOnlyClientData();
  await refreshPrivateConfig(fetchImpl);
  lockToHouseSitterMode(afterSitter);
  return { ok: true };
}

/** @internal */
export function resetDeviceSessionStoreForTests() {
  status = 'loading';
  mode = 'owner';
  ownerSessionExpiresAt = null;
  listeners.clear();
}

/** @internal */
export function setDeviceModeForTests(nextMode) {
  mode = nextMode === 'sitter' ? 'sitter' : 'owner';
  status = 'ready';
}
