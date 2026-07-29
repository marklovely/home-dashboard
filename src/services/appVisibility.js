import { getModeConfig } from '../modes/modeConfig.js';
import { getAppById, getAppsForProfile } from './appRegistry.js';
import { getActiveProfileId } from './profileService.js';

/**
 * Apps shown on Home and eligible for routing, based on app mode and profile.
 * @returns {import('../types/app.js').App[]}
 */
export function getVisibleApps() {
  const { homeAppIds } = getModeConfig();
  if (homeAppIds) {
    return homeAppIds.map((id) => getAppById(id)).filter(Boolean);
  }
  return getAppsForProfile(getActiveProfileId());
}

/**
 * @param {string} appId
 */
export function isAppVisible(appId) {
  return getVisibleApps().some((app) => app.id === appId);
}
