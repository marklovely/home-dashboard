import {
  isHubSetupWizardRerunRequested,
  requestHubSetupWizardRerun
} from './hubSetupWizardState.js';

/**
 * Open the hub setup wizard from Settings or another owner screen.
 * Allows re-running after onboarding with saved profile data pre-filled.
 *
 * @param {import('../../types/app.js').ShellContext} context
 */
export function openHubSetupWizard(context) {
  requestHubSetupWizardRerun();
  context.navigate('hub-setup');
}

export { isHubSetupWizardRerunRequested };
