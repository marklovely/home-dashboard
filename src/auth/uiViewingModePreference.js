import { isDemoHubEnvironment } from './hubEnvironment.js';

/** @typedef {'owner' | 'house-sitter'} UserModeId */

const UI_VIEWING_MODE_KEY = 'lovely_home_ui_viewing_mode';

/**
 * @returns {UserModeId | null}
 */
export function readPersistedUiViewingMode() {
  try {
    const value = sessionStorage.getItem(UI_VIEWING_MODE_KEY);
    if (value === 'owner' || value === 'house-sitter') return value;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {UserModeId} mode
 */
export function persistUiViewingMode(mode) {
  try {
    sessionStorage.setItem(UI_VIEWING_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function clearPersistedUiViewingMode() {
  try {
    sessionStorage.removeItem(UI_VIEWING_MODE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {'owner' | 'sitter'} serverMode
 * @returns {UserModeId}
 */
export function resolveUiViewingModeForDeviceSession(serverMode) {
  if (serverMode === 'sitter' && !isDemoHubEnvironment()) {
    return 'house-sitter';
  }

  const persisted = readPersistedUiViewingMode();
  if (persisted) return persisted;

  if (isDemoHubEnvironment()) {
    return 'owner';
  }

  return serverMode === 'owner' ? 'owner' : 'house-sitter';
}
