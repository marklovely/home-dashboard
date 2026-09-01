import { renderIcon } from '../components/icons/renderIcon.js';
import {
  getEffectiveTheme,
  subscribeToTheme,
  toggleEffectiveTheme
} from '../services/themeService.js';

/**
 * Header sun/moon control for owners and guests.
 */
export function initShellThemeToggle() {
  const button = document.querySelector('#shell-theme-toggle');
  if (!(button instanceof HTMLButtonElement)) return;

  const paint = () => {
    const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', next === 'light' ? 'Use light appearance' : 'Use dark appearance');
    button.replaceChildren(
      renderIcon(next === 'light' ? 'sun' : 'moon', { size: 22, className: 'shell-theme-toggle-icon' })
    );
  };

  button.addEventListener('click', () => {
    toggleEffectiveTheme();
  });

  subscribeToTheme(paint);
  paint();
}
