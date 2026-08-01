let wizardStep = 0;

export function getHubSetupWizardStep() {
  return wizardStep;
}

/**
 * @param {number} step
 */
export function setHubSetupWizardStep(step) {
  wizardStep = Math.max(0, step);
}

export function resetHubSetupWizardStep() {
  wizardStep = 0;
}
