import { describe, expect, it } from 'vitest';
import { HOME_ROUTE } from '../src/shell/router.js';
import { syncShellClockPlacement } from '../src/shell/shellClockPlacement.js';

describe('shellClockPlacement', () => {
  it('moves the clock into the home intro on owner home', () => {
    document.body.innerHTML = `
      <div class="shell-chrome-trailing"></div>
      <div class="shell-home-intro"></div>
      <section class="clock-block"></section>
    `;

    syncShellClockPlacement(HOME_ROUTE, { bottomNav: [] });

    expect(document.querySelector('.shell-home-intro')?.contains(document.querySelector('.clock-block'))).toBe(true);
  });

  it('keeps the clock in the toolbar on app routes', () => {
    document.body.innerHTML = `
      <div class="shell-chrome-trailing">
        <button type="button" id="shell-theme-toggle" class="shell-theme-toggle"></button>
      </div>
      <div class="shell-home-intro"></div>
      <section class="clock-block"></section>
    `;

    syncShellClockPlacement('weather', { bottomNav: [] });

    const trailing = document.querySelector('.shell-chrome-trailing');
    expect(trailing?.contains(document.querySelector('.clock-block'))).toBe(true);
    expect(trailing?.children[0]?.id).toBe('shell-theme-toggle');
    expect(trailing?.children[1]?.className).toBe('clock-block');
  });
});
