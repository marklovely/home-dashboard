import { describe, expect, it } from 'vitest';
import {
  clearHubSetupWizardForcedOpen,
  clearHubSetupWizardRerunRequest,
  getHubSetupWizardStep,
  isHubSetupWizardForced,
  isHubSetupWizardRerunRequested,
  requestHubSetupWizardAfterReset,
  requestHubSetupWizardRerun,
  resetHubSetupWizardStep,
  resetHubSetupWizardStateForTests,
  setHubSetupWizardStep
} from '../src/apps/HubSetup/hubSetupWizardState.js';

describe('hubSetupWizardState', () => {
  it('tracks wizard step', () => {
    resetHubSetupWizardStateForTests();
    expect(getHubSetupWizardStep()).toBe(0);
    setHubSetupWizardStep(3);
    expect(getHubSetupWizardStep()).toBe(3);
    resetHubSetupWizardStep();
    expect(getHubSetupWizardStep()).toBe(0);
  });

  it('tracks owner-initiated re-run requests', () => {
    resetHubSetupWizardStateForTests();
    expect(isHubSetupWizardRerunRequested()).toBe(false);

    setHubSetupWizardStep(4);
    requestHubSetupWizardRerun();
    expect(isHubSetupWizardRerunRequested()).toBe(true);
    expect(isHubSetupWizardForced()).toBe(false);
    expect(getHubSetupWizardStep()).toBe(0);

    clearHubSetupWizardRerunRequest();
    expect(isHubSetupWizardRerunRequested()).toBe(false);
  });

  it('tracks forced opens after factory reset', () => {
    resetHubSetupWizardStateForTests();
    requestHubSetupWizardAfterReset();
    expect(isHubSetupWizardForced()).toBe(true);
    expect(isHubSetupWizardRerunRequested()).toBe(false);
    clearHubSetupWizardForcedOpen();
    expect(isHubSetupWizardForced()).toBe(false);
  });
});
