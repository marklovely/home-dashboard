/** @typedef {'dark' | 'light' | 'auto'} ThemeId */

const STORAGE_KEY = 'home-hub-theme';

/** @type {ThemeId} */
let activeTheme = 'dark';

/** @type {MediaQueryList | null} */
let colorSchemeQuery = null;

/** @param {() => void} listener */
export function subscribeToTheme(listener) {
  document.addEventListener('home-hub-theme-change', listener);
  return () => document.removeEventListener('home-hub-theme-change', listener);
}

function notifyThemeChange() {
  document.dispatchEvent(new Event('home-hub-theme-change'));
}

/** @returns {ThemeId} */
export function getActiveTheme() {
  return activeTheme;
}

/** @returns {'dark' | 'light'} */
export function getEffectiveTheme() {
  if (activeTheme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return activeTheme;
}

/** @param {ThemeId} themeId
 *  @param {{ source?: 'user' | 'sync' }} [options]
 */
export function setActiveTheme(themeId, options = {}) {
  if (themeId !== 'dark' && themeId !== 'light' && themeId !== 'auto') return;
  activeTheme = themeId;
  applyTheme();
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
  notifyThemeChange();
  if (options.source !== 'sync') {
    document.dispatchEvent(new Event('home-hub-tablet-preference-change'));
  }
}

export function initTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'auto') {
      activeTheme = stored;
    }
  } catch {
    /* ignore */
  }

  colorSchemeQuery = window.matchMedia('(prefers-color-scheme: light)');
  colorSchemeQuery.addEventListener('change', onSystemColorSchemeChange);
  applyTheme();
}

function onSystemColorSchemeChange() {
  if (activeTheme !== 'auto') return;
  applyTheme();
  notifyThemeChange();
}

function applyTheme() {
  const effective = getEffectiveTheme();
  document.documentElement.dataset.theme = activeTheme;
  document.documentElement.style.colorScheme = activeTheme === 'auto' ? 'light dark' : effective;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', effective === 'light' ? '#eef1f7' : '#10131a');
  }
}

/** @internal */
export function resetThemeForTests() {
  activeTheme = 'dark';
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.style.colorScheme = 'dark';
}
