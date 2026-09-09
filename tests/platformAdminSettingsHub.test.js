import { beforeEach, describe, expect, it } from 'vitest';
import {
  renderSettingsHubShell,
  SETTINGS_TABS,
  wireSettingsHub
} from '../platform-admin/src/settingsHub.js';
import { renderStripeModePanel } from '../platform-admin/src/stripeMode.js';

describe('platform admin settings hub', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('renders tabbed shell with all settings slots before household grid order', () => {
    const html = renderSettingsHubShell();
    for (const tab of SETTINGS_TABS) {
      expect(html).toContain(`id="${tab.slotId}"`);
      expect(html).toContain(`data-settings-tab="${tab.id}"`);
    }
    expect(html).toContain('Platform settings');
  });

  it('shows one settings panel at a time', () => {
    document.body.innerHTML = renderSettingsHubShell();
    const stripeSlot = document.getElementById('stripe-mode-slot');
    stripeSlot.innerHTML = renderStripeModePanel({ mode: 'test', stripeBillingConfigured: true }, true);

    wireSettingsHub();

    expect(document.getElementById('stripe-mode-slot')?.classList.contains('is-active')).toBe(true);
    expect(document.getElementById('marketing-access-slot')?.classList.contains('is-active')).toBe(false);

    document.querySelector('[data-settings-tab="access"]')?.dispatchEvent(new Event('click'));

    expect(document.getElementById('stripe-mode-slot')?.classList.contains('is-active')).toBe(false);
    expect(document.getElementById('marketing-access-slot')?.classList.contains('is-active')).toBe(true);
    expect(sessionStorage.getItem('platform-admin-settings-tab')).toBe('access');
  });
});
