import { describe, expect, it } from 'vitest';
import { openHelpGuide } from '../src/components/HelpGuide/helpGuide.js';
import { createFieldInfoHint, createFieldLabelBlock } from '../src/components/HelpGuide/fieldHelp.js';
import { OWNER_HELP_SECTIONS } from '../src/components/HelpGuide/ownerHelpContent.js';
import {
  HUB_SETUP_HELP_SECTIONS,
  getBinScheduleGuestCopy,
  hubSetupHelpSectionForStep
} from '../src/components/HubSetup/hubSetupHelpContent.js';
import { openHubSetupHelp } from '../src/components/HubSetup/hubSetupHelp.js';

describe('hub setup help', () => {
  it('defines unique setup guide sections for each wizard step', () => {
    expect(HUB_SETUP_HELP_SECTIONS.length).toBe(8);
    expect(new Set(HUB_SETUP_HELP_SECTIONS.map((section) => section.id)).size).toBe(8);
    expect(hubSetupHelpSectionForStep('hub')).toBe('step-hub');
    expect(hubSetupHelpSectionForStep('bins')).toBe('step-bins');
    expect(hubSetupHelpSectionForStep('calendar')).toBe('step-calendar');
    expect(hubSetupHelpSectionForStep('guide')).toBe('step-guide');
  });

  it('opens the hub setup guide overlay', () => {
    openHubSetupHelp({ initialSectionId: 'step-access' });
    expect(document.querySelector('.help-guide-overlay')).toBeTruthy();
    expect(document.querySelector('.help-guide-content-title')?.textContent).toBe('Step 4 — Guest access');
    document.querySelector('.help-guide-close')?.dispatchEvent(new Event('click'));
    expect(document.querySelector('.help-guide-overlay')).toBeNull();
  });

  it('uses guest-aware bin schedule copy for each use case', () => {
    expect(getBinScheduleGuestCopy('airbnb').locationHint).toContain('guests');
    expect(getBinScheduleGuestCopy('airbnb').locationHint).not.toContain('sitters');
    expect(getBinScheduleGuestCopy('housesitter').locationHint).toContain('sitters');
    expect(getBinScheduleGuestCopy('both').locationHint).toContain('guests and sitters');
  });
});

describe('field help', () => {
  it('renders label row with expandable info panel', () => {
    const { fragment } = createFieldLabelBlock('Hub name', {
      hint: 'Shown in the header.',
      helpText: 'Pick a friendly property name.'
    });

    const host = document.createElement('div');
    host.append(fragment);
    expect(host.querySelector('.field-help-hint')?.textContent).toContain('Shown in the header');

    const info = createFieldInfoHint('More detail here', 'Help: test');
    info.button.click();
    expect(info.panel.hidden).toBe(false);
  });
});

describe('hub help guides integration', () => {
  it('still opens owner guide with hub setup section available', () => {
    expect(OWNER_HELP_SECTIONS.some((section) => section.id === 'hub-setup')).toBe(true);
    expect(OWNER_HELP_SECTIONS.some((section) => section.id === 'bins')).toBe(true);
    const binsHelp = HUB_SETUP_HELP_SECTIONS.find((section) => section.id === 'step-bins');
    expect(JSON.stringify(binsHelp)).toMatch(/Add dates to list/);
    expect(JSON.stringify(binsHelp)).toMatch(/Save/);
    expect(JSON.stringify(OWNER_HELP_SECTIONS.find((section) => section.id === 'bins'))).toMatch(
      /Save bin reminders/
    );

    openHelpGuide({
      title: 'Owner guide',
      sections: OWNER_HELP_SECTIONS,
      initialSectionId: 'hub-setup',
      dialogId: 'test-owner-hub-setup-help'
    });
    expect(document.querySelector('.help-guide-content-title')?.textContent).toBe('Hub setup wizard');
    document.querySelector('.help-guide-close')?.click();
  });
});
