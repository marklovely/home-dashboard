import { afterEach, describe, expect, it } from 'vitest';
import { initShellThemeToggle } from '../src/shell/shellThemeToggle.js';
import { getActiveTheme, resetThemeForTests, setActiveTheme } from '../src/services/themeService.js';

describe('shellThemeToggle', () => {
  afterEach(() => {
    resetThemeForTests();
    document.body.innerHTML = '';
  });

  it('shows a sun in dark mode and toggles to light', () => {
    document.body.innerHTML = '<button type="button" id="shell-theme-toggle" class="shell-theme-toggle"></button>';
    setActiveTheme('dark');
    initShellThemeToggle();

    const button = document.querySelector('#shell-theme-toggle');
    expect(button?.getAttribute('aria-label')).toBe('Use light appearance');
    expect(button?.querySelector('svg.shell-theme-toggle-icon')).toBeTruthy();

    button?.click();

    expect(getActiveTheme()).toBe('light');
    expect(button?.getAttribute('aria-label')).toBe('Use dark appearance');
  });
});
