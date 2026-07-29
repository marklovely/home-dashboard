/** @typedef {'dark' | 'light' | 'auto'} ThemeId */

const STORAGE_KEY = 'home-hub-theme';

/** @type {ThemeId} */
let activeTheme = 'dark';

/** @returns {ThemeId} */
export function getActiveTheme() {
  return activeTheme;
}

/** @param {ThemeId} themeId */
export function setActiveTheme(themeId) {
  if (themeId !== 'dark') return;
  activeTheme = themeId;
  applyTheme();
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
}

export function initTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') activeTheme = 'dark';
  } catch {
    /* ignore */
  }
  applyTheme();
}

function applyTheme() {
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.style.colorScheme = 'dark';
}
