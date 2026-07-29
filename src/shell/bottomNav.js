import { renderIcon } from '../../components/icons/renderIcon.js';
import { getModeConfig } from '../../modes/modeConfig.js';
import { HOME_ROUTE, getCurrentRoute } from './router.js';

/**
 * @param {HTMLElement} navRoot
 * @param {(route: string) => void} navigate
 */
export function mountShellBottomNav(navRoot, navigate) {
  const mode = getModeConfig();
  if (!mode.bottomNav?.length) {
    navRoot.hidden = true;
    navRoot.replaceChildren();
    return;
  }

  navRoot.hidden = false;
  navRoot.replaceChildren();
  navRoot.className = 'shell-bottom-nav';
  navRoot.setAttribute('aria-label', 'Main navigation');

  const current = getCurrentRoute();

  for (const item of mode.bottomNav) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shell-bottom-nav-item';
    button.dataset.route = item.route;
    const isActive = current === item.route || (item.route === HOME_ROUTE && current === HOME_ROUTE);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');

    const icon = document.createElement('span');
    icon.className = 'shell-bottom-nav-icon';
    icon.append(renderIcon(item.iconId, { size: 22, className: 'shell-bottom-nav-svg' }));

    const label = document.createElement('span');
    label.className = 'shell-bottom-nav-label';
    label.textContent = item.label;

    button.append(icon, label);
    button.addEventListener('click', () => navigate(item.route));
    navRoot.append(button);
  }
}

/**
 * @param {HTMLElement} navRoot
 */
export function syncShellBottomNav(navRoot) {
  const mode = getModeConfig();
  if (!mode.bottomNav?.length) return;
  const current = getCurrentRoute();
  for (const button of navRoot.querySelectorAll('.shell-bottom-nav-item')) {
    const route = button instanceof HTMLElement ? button.dataset.route : null;
    const isActive = route === current || (route === HOME_ROUTE && current === HOME_ROUTE);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  }
}
