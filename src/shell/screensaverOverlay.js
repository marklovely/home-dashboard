import { formatDate, formatTime } from '../js/utils/format.js';
import { subscribeToDisplayPreferences } from '../services/displayPreferencesService.js';
import {
  recordScreensaverActivity,
  shouldShowScreensaver,
  subscribeToScreensaver,
  wakeScreensaver
} from '../services/screensaverService.js';
import { subscribeToUserMode } from '../auth/userMode.js';
import { navigate, HOME_ROUTE } from './router.js';
import { startBurnInProtection, stopBurnInProtection } from './screensaverBurnIn.js';

/**
 * @param {{
 *   overlay: HTMLElement,
 *   clock: HTMLElement,
 *   date: HTMLElement,
 *   panel: HTMLElement
 * }} elements
 */
function updateScreensaverClock(elements) {
  const now = new Date();
  elements.clock.textContent = formatTime(now);
  elements.date.textContent = formatDate(now);
}

/**
 * @param {{
 *   overlay: HTMLElement,
 *   clock: HTMLElement,
 *   date: HTMLElement,
 *   panel: HTMLElement
 * }} elements
 */
function syncScreensaverVisibility(elements) {
  const active = shouldShowScreensaver();
  const wasActive = !elements.overlay.hidden;
  elements.overlay.hidden = !active;
  elements.overlay.setAttribute('aria-hidden', active ? 'false' : 'true');
  document.body.classList.toggle('screensaver-active', active);
  if (active) {
    updateScreensaverClock(elements);
    if (!wasActive) {
      startBurnInProtection(elements.panel);
    }
    return;
  }
  if (wasActive) {
    stopBurnInProtection(elements.panel);
  }
}

export function initScreensaverOverlay() {
  const overlay = document.querySelector('#screensaver-overlay');
  const panel = overlay?.querySelector('.screensaver-panel');
  const clock = document.querySelector('#screensaver-clock');
  const date = document.querySelector('#screensaver-date');

  if (
    !(overlay instanceof HTMLElement) ||
    !(panel instanceof HTMLElement) ||
    !(clock instanceof HTMLElement) ||
    !(date instanceof HTMLElement)
  ) {
    return;
  }

  const elements = { overlay, panel, clock, date };

  const refresh = () => syncScreensaverVisibility(elements);

  overlay.addEventListener('click', () => {
    if (!shouldShowScreensaver()) return;
    wakeScreensaver();
    refresh();
    navigate(HOME_ROUTE);
  });

  const onActivity = () => {
    if (shouldShowScreensaver()) return;
    recordScreensaverActivity();
  };

  for (const eventName of ['pointerdown', 'touchstart', 'keydown', 'click']) {
    document.addEventListener(eventName, onActivity, { capture: true, passive: true });
  }

  subscribeToScreensaver(refresh);
  subscribeToUserMode(refresh);
  subscribeToDisplayPreferences(() => updateScreensaverClock(elements));

  updateScreensaverClock(elements);
  refresh();
  window.setInterval(() => {
    updateScreensaverClock(elements);
    refresh();
  }, 1000);
}
