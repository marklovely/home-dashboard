import { formatDate, formatTime } from '../js/utils/format.js';
import { subscribeToDisplayPreferences } from '../services/displayPreferencesService.js';
import {
  clearBinAlertBannerHost,
  mountBinAlertBannerHost
} from '../services/binAlertBannerSync.js';
import {
  recordScreensaverActivity,
  shouldShowScreensaver,
  subscribeToScreensaver,
  wakeScreensaver
} from '../services/screensaverService.js';
import { subscribeToUserMode } from '../auth/userMode.js';
import { navigate, HOME_ROUTE } from './router.js';
import { startBurnInProtection, stopBurnInProtection, startBinAlertBurnInProtection, stopBinAlertBurnInProtection } from './screensaverBurnIn.js';

/** @type {boolean} */
let binAlertBurnInActive = false;

/**
 * @param {{
 *   overlay: HTMLElement,
 *   clock: HTMLElement,
 *   date: HTMLElement,
 *   panel: HTMLElement,
 *   binAlertHost: HTMLElement
 * }} elements
 * @param {{ sync: () => void }} binAlertController
 * @param {boolean} active
 */
function syncScreensaverBinAlert(elements, binAlertController, active) {
  if (!active) {
    if (binAlertBurnInActive) {
      stopBinAlertBurnInProtection(elements.binAlertHost);
      binAlertBurnInActive = false;
    }
    clearBinAlertBannerHost(elements.binAlertHost);
    return;
  }

  binAlertController.sync();
  const showingBinAlert = !elements.binAlertHost.hidden;
  if (showingBinAlert && !binAlertBurnInActive) {
    startBinAlertBurnInProtection(elements.binAlertHost);
    binAlertBurnInActive = true;
    return;
  }
  if (!showingBinAlert && binAlertBurnInActive) {
    stopBinAlertBurnInProtection(elements.binAlertHost);
    binAlertBurnInActive = false;
  }
}

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
 *   panel: HTMLElement,
 *   binAlertHost: HTMLElement
 * }} elements
 * @param {{ sync: () => void }} binAlertController
 */
function syncScreensaverVisibility(elements, binAlertController) {
  const active = shouldShowScreensaver();
  const wasActive = !elements.overlay.hidden;
  elements.overlay.hidden = !active;
  elements.overlay.setAttribute('aria-hidden', active ? 'false' : 'true');
  document.body.classList.toggle('screensaver-active', active);
  syncScreensaverBinAlert(elements, binAlertController, active);
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
  const binAlertHost = document.querySelector('#screensaver-bin-alert-host');

  if (
    !(overlay instanceof HTMLElement) ||
    !(panel instanceof HTMLElement) ||
    !(clock instanceof HTMLElement) ||
    !(date instanceof HTMLElement) ||
    !(binAlertHost instanceof HTMLElement)
  ) {
    return;
  }

  const elements = { overlay, panel, clock, date, binAlertHost };

  const binAlertController = mountBinAlertBannerHost(
    binAlertHost,
    (appId) => {
      wakeScreensaver();
      syncScreensaverVisibility(elements, binAlertController);
      navigate(appId);
    },
    { houseSitter: true, className: 'bin-alert-banner--screensaver' }
  );

  const refresh = () => syncScreensaverVisibility(elements, binAlertController);

  overlay.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('.bin-alert-banner')) {
      return;
    }
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
