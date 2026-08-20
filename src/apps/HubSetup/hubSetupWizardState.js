let wizardStep = 0;
let rerunRequested = false;

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

/** Mark the next hub-setup visit as an owner-initiated re-run. */
export function requestHubSetupWizardRerun() {
  rerunRequested = true;
  wizardStep = 0;
}

export function isHubSetupWizardRerunRequested() {
  return rerunRequested;
}

export function clearHubSetupWizardRerunRequest() {
  rerunRequested = false;
}
