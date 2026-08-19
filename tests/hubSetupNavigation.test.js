import { describe, expect, it } from 'vitest';
import {
  getHubSetupStepMeta,
  getWizardSteps,
  HUB_SETUP_STEPS
} from '../src/apps/HubSetup/hubSetupNavigation.js';

describe('hubSetupNavigation', () => {
  it('includes pets for housesitter and both use cases only', () => {
    expect(getWizardSteps('owner')).toEqual(['hub', 'contacts', 'access', 'bins', 'calendar', 'guide']);
    expect(getWizardSteps('airbnb')).toEqual(['hub', 'contacts', 'access', 'bins', 'calendar', 'guide']);
    expect(getWizardSteps('housesitter')).toContain('pets');
    expect(getWizardSteps('both')).toContain('pets');
  });

  it('provides labels and descriptions for each wizard step', () => {
    for (const stepId of getWizardSteps('both')) {
      const meta = getHubSetupStepMeta(stepId);
      expect(meta?.label).toBeTruthy();
      expect(meta?.description).toBeTruthy();
    }
    expect(HUB_SETUP_STEPS.find((step) => step.id === 'pets')?.optional).toBe(true);
  });
});
