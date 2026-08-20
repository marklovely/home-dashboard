import { isOwnerUserMode } from '../../auth/userMode.js';
import { getCurrentRoute } from '../../shell/router.js';
import {
  isOnboardingComplete,
  isSiteProfileReady,
  isSiteSetupAvailable
} from '../../services/siteProfileService.js';
import {
  isHubSetupWizardForced,
  isHubSetupWizardRerunRequested
} from './hubSetupWizardState.js';

/**
 * @returns {boolean}
 */
export function shouldAllowHubSetupWizard() {
  if (isHubSetupWizardForced() || isHubSetupWizardRerunRequested()) {
    return true;
  }
  if (!isSiteProfileReady()) return false;
  return !isOnboardingComplete();
}

/**
 * @returns {boolean}
 */
export function shouldAutoOpenHubSetupWizard() {
  if (!isOwnerUserMode()) return false;
  if (!isSiteProfileReady()) return false;
  if (!isSiteSetupAvailable()) return false;
  if (getCurrentRoute() === 'hub-setup') return false;
  return shouldAllowHubSetupWizard();
}

/**
 * @returns {boolean}
 */
export function shouldLeaveHubSetupWizard() {
  if (getCurrentRoute() !== 'hub-setup') return false;
  if (isHubSetupWizardForced() || isHubSetupWizardRerunRequested()) return false;
  if (!isSiteProfileReady()) return false;
  return isOnboardingComplete();
}
