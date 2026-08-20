import { describe, expect, it } from 'vitest';
import {
  clearHubSetupWizardRerunRequest,
  getHubSetupWizardStep,
  isHubSetupWizardRerunRequested,
  requestHubSetupWizardRerun,
  resetHubSetupWizardStep,
  setHubSetupWizardStep
} from '../src/apps/HubSetup/hubSetupWizardState.js';

describe('hubSetupWizardState', () => {
  it('tracks wizard step', () => {
    resetHubSetupWizardStep();
    expect(getHubSetupWizardStep()).toBe(0);
    setHubSetupWizardStep(3);
    expect(getHubSetupWizardStep()).toBe(3);
    resetHubSetupWizardStep();
    expect(getHubSetupWizardStep()).toBe(0);
  });

  it('tracks owner-initiated re-run requests', () => {
    clearHubSetupWizardRerunRequest();
    expect(isHubSetupWizardRerunRequested()).toBe(false);

    setHubSetupWizardStep(4);
    requestHubSetupWizardRerun();
    expect(isHubSetupWizardRerunRequested()).toBe(true);
    expect(getHubSetupWizardStep()).toBe(0);

    clearHubSetupWizardRerunRequest();
    expect(isHubSetupWizardRerunRequested()).toBe(false);
  });
});
