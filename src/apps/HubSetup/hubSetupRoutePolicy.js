import { getCurrentRoute, navigate, subscribeToRoute } from '../../shell/router.js';
import { isOwnerUserMode } from '../../auth/userMode.js';
import {
  shouldAutoOpenHubSetupWizard,
  shouldLeaveHubSetupWizard
} from './hubSetupRouting.js';
import { subscribeToSiteProfile } from '../../services/siteProfileService.js';

/** @type {boolean} */
let hasAttemptedInitialHubSetupOpen = false;

/**
 * Keep hub-setup routing aligned with the latest profile sync and wizard flags.
 *
 * @param {{ routeChange?: boolean }} [options]
 */
export function applyHubSetupRoutePolicy(options = {}) {
  if (shouldLeaveHubSetupWizard()) {
    navigate('home');
    return;
  }

  if (!options.routeChange && shouldAutoOpenHubSetupWizard()) {
    if (hasAttemptedInitialHubSetupOpen) return;
    hasAttemptedInitialHubSetupOpen = true;
    navigate('hub-setup');
  }
}

/**
 * @param {() => void} [onInitialSync]
 */
export function initHubSetupRoutePolicy(onInitialSync) {
  const runOnProfileSync = () => {
    if (!isOwnerUserMode()) return;
    applyHubSetupRoutePolicy();
  };
  const runOnRouteChange = () => {
    if (!isOwnerUserMode()) return;
    applyHubSetupRoutePolicy({ routeChange: true });
  };

  subscribeToSiteProfile(runOnProfileSync);
  subscribeToRoute(runOnRouteChange);
  runOnProfileSync();
  onInitialSync?.();
}

/** @internal */
export function resetHubSetupRoutePolicyForTests() {
  hasAttemptedInitialHubSetupOpen = false;
  void getCurrentRoute;
}
