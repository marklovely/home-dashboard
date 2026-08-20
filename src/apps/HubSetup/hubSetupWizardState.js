let wizardStep = 0;
let rerunRequested = false;
let forcedOpen = false;

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
  forcedOpen = false;
  wizardStep = 0;
}

/** Open the wizard after factory reset even if routing checks run before profile state settles. */
export function requestHubSetupWizardAfterReset() {
  rerunRequested = false;
  forcedOpen = true;
  wizardStep = 0;
}

export function isHubSetupWizardRerunRequested() {
  return rerunRequested;
}

export function isHubSetupWizardForced() {
  return forcedOpen;
}

export function clearHubSetupWizardRerunRequest() {
  rerunRequested = false;
}

export function clearHubSetupWizardForcedOpen() {
  forcedOpen = false;
}

/** @internal */
export function resetHubSetupWizardStateForTests() {
  wizardStep = 0;
  rerunRequested = false;
  forcedOpen = false;
}
