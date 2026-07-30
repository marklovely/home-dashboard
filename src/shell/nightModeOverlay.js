import { formatDate, formatTime } from '../js/utils/format.js';
import { subscribeToDisplayPreferences } from '../services/displayPreferencesService.js';
import {
  shouldShowNightMode,
  snoozeNightMode,
  subscribeToNightMode
} from '../services/nightModeService.js';
import { subscribeToUserMode } from '../auth/userMode.js';
import { navigate, HOME_ROUTE } from './router.js';

/**
 * @param {{
 *   overlay: HTMLElement,
 *   clock: HTMLElement,
 *   date: HTMLElement,
 *   hint: HTMLElement
 * }} elements
 */
function updateNightClock(elements) {
  const now = new Date();
  elements.clock.textContent = formatTime(now);
  elements.date.textContent = formatDate(now);
}

/**
 * @param {{
 *   overlay: HTMLElement,
 *   clock: HTMLElement,
 *   date: HTMLElement,
 *   hint: HTMLElement
 * }} elements
 */
function syncNightModeVisibility(elements) {
  const active = shouldShowNightMode();
  elements.overlay.hidden = !active;
  document.body.classList.toggle('night-mode-active', active);
  if (active) {
    updateNightClock(elements);
  }
}

export function initNightModeOverlay() {
  const overlay = document.querySelector('#night-mode-overlay');
  const clock = document.querySelector('#night-mode-clock');
  const date = document.querySelector('#night-mode-date');
  const hint = document.querySelector('#night-mode-hint');

  if (!(overlay instanceof HTMLElement) || !(clock instanceof HTMLElement) || !(date instanceof HTMLElement)) {
    return;
  }

  const elements = {
    overlay,
    clock,
    date,
    hint: hint instanceof HTMLElement ? hint : document.createElement('p')
  };

  const refresh = () => syncNightModeVisibility(elements);

  overlay.addEventListener('click', () => {
    if (!shouldShowNightMode()) return;
    snoozeNightMode();
    refresh();
    navigate(HOME_ROUTE);
  });

  subscribeToNightMode(refresh);
  subscribeToUserMode(refresh);
  subscribeToDisplayPreferences(() => updateNightClock(elements));

  updateNightClock(elements);
  refresh();
  window.setInterval(() => {
    updateNightClock(elements);
    refresh();
  }, 1000);
}
