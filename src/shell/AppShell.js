import { renderHomeScreen } from '../apps/Home/renderHome.js';
import { getAppById, getAppsForProfile } from '../services/appRegistry.js';
import { getActiveProfileId, subscribeToProfileChange } from '../services/profileService.js';
import { getCurrentRoute, HOME_ROUTE, initRouter, navigate, subscribeToRoute } from './router.js';

/**
 * @param {Object} options
 * @param {HTMLElement} options.viewport
 * @param {HTMLElement} options.homeWelcome
 * @param {HTMLElement} options.shellChromeTitle
 * @param {HTMLElement} options.homeButton
 * @param {HTMLElement} options.statusStrip
 * @param {HTMLElement} options.shellFooter
 * @param {import('../types/app.js').ShellContext} options.shellContext
 */
export function createAppShell({
  viewport,
  homeWelcome,
  shellChromeTitle,
  homeButton,
  statusStrip,
  shellFooter,
  shellContext
}) {
  /** @param {string} route */
  const renderRoute = (route) => {
    viewport.classList.remove('is-active');
    void viewport.offsetWidth;
    viewport.classList.add('is-active');

    const isHome = route === HOME_ROUTE;
    homeWelcome.hidden = !isHome;
    statusStrip.hidden = !isHome;
    shellFooter.hidden = route !== 'controls';

    shellChromeTitle.textContent = isHome ? 'Home Hub' : (getAppById(route)?.title ?? 'Home Hub');
    homeButton.setAttribute('aria-current', isHome ? 'page' : 'false');

    if (isHome) {
      document.title = 'Home Hub';
      void renderHomeScreen(viewport, getAppsForProfile(getActiveProfileId()), shellContext);
      return;
    }

    const app = getAppById(route);
    if (!app) {
      shellContext.navigate(HOME_ROUTE);
      return;
    }

    document.title = `${app.title} · Home Hub`;
    app.mount(viewport, shellContext);
  };

  shellContext.refreshShell = () => {
    renderRoute(getCurrentRoute());
  };

  homeButton.addEventListener('click', () => shellContext.navigate(HOME_ROUTE));

  subscribeToRoute(renderRoute);
  subscribeToProfileChange(() => {
    renderRoute(getCurrentRoute());
  });
  initRouter(getAppById);
}

export { navigate, HOME_ROUTE };
