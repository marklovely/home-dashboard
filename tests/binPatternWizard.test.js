import { describe, expect, it } from 'vitest';
import { createBinPatternWizard } from '../src/components/HubSetup/binPatternWizard.js';
import { readBinScheduleFromProfile } from '../src/lib/binScheduleProfile.js';

describe('createBinPatternWizard', () => {
  it('advances through sub-steps on handleContinue without resetting', () => {
    const schedule = readBinScheduleFromProfile({});
    const wizard = createBinPatternWizard(schedule, () => {});

    expect(wizard.progressLabel()).toContain('Step 1 of 4');

    expect(wizard.handleContinue()).toBe(true);
    expect(wizard.progressLabel()).toContain('Step 2 of 4');

    expect(wizard.handleContinue()).toBe(true);
    expect(wizard.progressLabel()).toContain('Step 3 of 4');
  });

  it('finish returns generated household dates', () => {
    let saved = null;
    const wizard = createBinPatternWizard(readBinScheduleFromProfile({}), (next) => {
      saved = next;
    });

    expect(wizard.handleContinue()).toBe(true);
    expect(wizard.handleContinue()).toBe(true);

    const dateInput = wizard.wrap.querySelector('input[type="date"]');
    expect(dateInput).toBeTruthy();
    dateInput.value = '2026-09-12';
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(wizard.handleContinue()).toBe(true);
    const finished = wizard.finish();

    expect(finished.household.length).toBeGreaterThan(0);
    expect(saved?.household?.length).toBeGreaterThan(0);
  });

  it('returns pick-stream when no bin types are selected', () => {
    const wizard = createBinPatternWizard(readBinScheduleFromProfile({}), () => {});
    const body = wizard.wrap.querySelector('.hub-setup-bin-stream-list');
    for (const input of body.querySelectorAll('input[type="checkbox"]')) {
      input.checked = false;
      input.dispatchEvent(new Event('change'));
    }

    expect(wizard.handleContinue()).toBe('pick-stream');
    expect(wizard.progressLabel()).toContain('Step 1 of 4');
  });
});
