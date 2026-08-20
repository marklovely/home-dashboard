import { setActiveProfileId } from '../../services/profileService.js';
import { UserMode, isOwnerUserMode, setUserMode } from '../../auth/userMode.js';
import { getCurrentRoute } from '../../shell/router.js';
import {
  requestHubSetupWizardAfterReset,
  requestHubSetupWizardRerun
} from './hubSetupWizardState.js';

export { isHubSetupWizardForced, isHubSetupWizardRerunRequested } from './hubSetupWizardState.js';
export { shouldAllowHubSetupWizard, shouldAutoOpenHubSetupWizard, shouldLeaveHubSetupWizard } from './hubSetupRouting.js';

/**
 * Hub setup is owner-only — ensure viewing mode matches before opening the wizard.
 */
export function ensureOwnerModeForHubSetup() {
  if (!isOwnerUserMode()) {
    setUserMode(UserMode.Owner);
    setActiveProfileId('owner');
  }
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {{ forceRemount?: boolean }} [options]
 */
function navigateToHubSetup(context, options = {}) {
  const alreadyOnRoute = getCurrentRoute() === 'hub-setup';
  context.navigate('hub-setup');
  if (options.forceRemount || alreadyOnRoute) {
    context.refreshShell?.();
  }
}

/**
 * Open the hub setup wizard from Settings or another owner screen.
 * Allows re-running after onboarding with saved profile data pre-filled.
 *
 * @param {import('../../types/app.js').ShellContext} context
 */
export function openHubSetupWizard(context) {
  ensureOwnerModeForHubSetup();
  requestHubSetupWizardRerun();
  navigateToHubSetup(context);
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
export function openHubSetupWizardAfterReset(context) {
  ensureOwnerModeForHubSetup();
  requestHubSetupWizardAfterReset();
  navigateToHubSetup(context, { forceRemount: true });
}
