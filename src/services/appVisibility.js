import { getModeConfig } from '../modes/modeConfig.js';
import { getAppById, getAppsForProfile } from './appRegistry.js';
import { getActiveProfileId } from './profileService.js';
import { isOwnerUserMode } from '../auth/userMode.js';

/**
 * Apps shown on Home and eligible for routing, based on app mode and profile.
 * @returns {import('../types/app.js').App[]}
 */
export function getVisibleApps() {
  const { homeAppIds } = getModeConfig();
  if (homeAppIds) {
    return homeAppIds.map((id) => getAppById(id)).filter(Boolean);
  }
  return getAppsForProfile(getActiveProfileId()).filter((app) => app.id !== 'hub-setup');
}

/**
 * @param {string} appId
 */
export function isAppVisible(appId) {
  if (appId === 'hub-setup') {
    return isOwnerUserMode();
  }
  const { homeAppIds, routableAppIds } = getModeConfig();
  if (routableAppIds?.length) {
    return routableAppIds.includes(appId);
  }
  if (homeAppIds) {
    return homeAppIds.includes(appId);
  }
  return getVisibleApps().some((app) => app.id === appId);
}
