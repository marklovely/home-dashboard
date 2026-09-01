import { afterEach, describe, expect, it, vi } from 'vitest';
import { initShellBrandLogo, syncShellBrandLogoRoute } from '../src/shell/shellBrandLogo.js';
import { resetThemeForTests, setActiveTheme } from '../src/services/themeService.js';

describe('shellBrandLogo', () => {
  afterEach(() => {
    resetThemeForTests();
  });

  it('navigates home on a short logo tap', () => {
    const onNavigateHome = vi.fn();
    document.body.innerHTML = `
      <div class="shell-chrome-title-block">
        <button type="button" id="shell-logo-button" class="shell-logo-button">
          <img id="shell-logo" class="shell-logo" src="/api/branding/logo" alt="" />
          <span id="shell-eyebrow" class="shell-eyebrow-text">HOME HUB</span>
        </button>
      </div>
    `;

    initShellBrandLogo({ onNavigateHome });
    document.querySelector('#shell-logo-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('marks the logo button as current on home', () => {
    document.body.innerHTML = '<button type="button" id="shell-logo-button"></button>';

    syncShellBrandLogoRoute(true);

    expect(document.querySelector('#shell-logo-button')?.getAttribute('aria-current')).toBe('page');
  });

  it('uses the dark-on-cream lockup in light appearance', () => {
    document.body.innerHTML = `
      <div class="shell-chrome-title-block">
        <button type="button" id="shell-logo-button" class="shell-logo-button">
          <img id="shell-logo" class="shell-logo" src="/api/branding/logo" alt="" />
          <span id="shell-eyebrow" class="shell-eyebrow-text">HOME HUB</span>
        </button>
      </div>
    `;

    setActiveTheme('light');
    initShellBrandLogo();

    expect(document.querySelector('#shell-logo')?.getAttribute('src')).toMatch(/lockup-light/);
  });
});
