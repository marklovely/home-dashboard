import { getCurrentRoute, navigate } from './router.js';
import { isOwnerUserMode } from '../auth/userMode.js';
import {
  shouldAutoOpenHubSetupWizard,
  shouldLeaveHubSetupWizard
} from './hubSetupRouting.js';
import { subscribeToSiteProfile } from '../services/siteProfileService.js';

/**
 * Keep hub-setup routing aligned with the latest profile sync and wizard flags.
 */
export function applyHubSetupRoutePolicy() {
  if (shouldLeaveHubSetupWizard()) {
    navigate('home');
    return;
  }

  if (shouldAutoOpenHubSetupWizard()) {
    navigate('hub-setup');
  }
}

/**
 * @param {() => void} [onInitialSync]
 */
export function initHubSetupRoutePolicy(onInitialSync) {
  const run = () => {
    if (!isOwnerUserMode()) return;
    applyHubSetupRoutePolicy();
  };

  subscribeToSiteProfile(run);
  run();
  onInitialSync?.();
}

/** @internal */
export function resetHubSetupRoutePolicyForTests() {
  void getCurrentRoute;
}
