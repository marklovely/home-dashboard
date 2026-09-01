import { HOME_ROUTE } from './router.js';

/**
 * Owner home keeps the clock with the welcome row; other routes keep it in the toolbar.
 *
 * @param {string} route
 * @param {{ bottomNav?: unknown[] }} mode
 */
export function syncShellClockPlacement(route, mode) {
  const clock = document.querySelector('.clock-block');
  const trailing = document.querySelector('.shell-chrome-trailing');
  const intro = document.querySelector('.shell-home-intro');
  if (!(clock instanceof HTMLElement) || !(trailing instanceof HTMLElement) || !(intro instanceof HTMLElement)) {
    return;
  }

  const useHomeIntro = route === HOME_ROUTE && !mode.bottomNav?.length;
  const target = useHomeIntro ? intro : trailing;
  if (clock.parentElement === target) return;

  if (useHomeIntro) {
    intro.prepend(clock);
    return;
  }

  const themeToggle = trailing.querySelector('#shell-theme-toggle');
  if (themeToggle instanceof HTMLElement) {
    themeToggle.after(clock);
    return;
  }

  trailing.prepend(clock);
}
