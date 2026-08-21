import { getModeConfig } from '../modes/modeConfig.js';
import { getAppById, getAppsForProfile } from './appRegistry.js';
import { filterAppsForEnvironment, isAppEnabledForEnvironment } from './environmentAppPolicy.js';
import { getActiveProfileId } from './profileService.js';
import { isOwnerUserMode } from '../auth/userMode.js';
import { isCamerasConfigured, readCamerasFromProfile } from '../lib/cameraProfile.js';
import { getSiteProfileState } from './siteProfileService.js';

/**
 * @param {import('../types/app.js').App} app
 */
function isAppConfiguredForHub(app) {
  if (app.id !== 'cameras') return true;
  const cameras = readCamerasFromProfile(getSiteProfileState()?.profile ?? {});
  return isCamerasConfigured(cameras);
}

/**
 * Apps shown on Home and eligible for routing, based on app mode and profile.
 * @returns {import('../types/app.js').App[]}
 */
export function getVisibleApps() {
  const { homeAppIds } = getModeConfig();
  const baseApps = homeAppIds
    ? filterAppsForEnvironment(homeAppIds.map((id) => getAppById(id)).filter(Boolean))
    : filterAppsForEnvironment(
        getAppsForProfile(getActiveProfileId()).filter((app) => app.id !== 'hub-setup')
      );
  return baseApps.filter(isAppConfiguredForHub);
}

/**
 * @param {string} appId
 */
export function isAppVisible(appId) {
  if (appId === 'hub-setup') {
    return isOwnerUserMode();
  }
  const app = getAppById(appId);
  if (!app || !isAppEnabledForEnvironment(app)) {
    return false;
  }
  if (!isAppConfiguredForHub(app)) {
    return false;
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
