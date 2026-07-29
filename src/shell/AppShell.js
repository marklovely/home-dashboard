import { renderHomeScreen } from '../apps/Home/renderHome.js';
import { getAppById, getAppsForProfile } from '../services/appRegistry.js';
import { getActiveProfileId } from '../services/profileService.js';
import { HOME_ROUTE, initRouter, navigate, subscribeToRoute } from './router.js';

/**
 * @param {Object} options
 * @param {HTMLElement} options.viewport
 * @param {HTMLElement} options.homeHeader
 * @param {HTMLElement} options.appNav
 * @param {HTMLElement} options.homeButton
 * @param {HTMLElement} options.appTitle
 * @param {HTMLElement} options.statusStrip
 * @param {HTMLElement} options.shellFooter
 * @param {import('../types/app.js').ShellContext} options.shellContext
 */
export function createAppShell({
  viewport,
  homeHeader,
  appNav,
  homeButton,
  appTitle,
  statusStrip,
  shellFooter,
  shellContext
}) {
  const renderRoute = (route) => {
    viewport.classList.remove('is-active');
    void viewport.offsetWidth;
    viewport.classList.add('is-active');

    const isHome = route === HOME_ROUTE;
    homeHeader.hidden = !isHome;
    appNav.hidden = isHome;
    statusStrip.hidden = !isHome;
    shellFooter.hidden = route !== 'controls';

    if (isHome) {
      document.title = 'Home Hub';
      renderHomeScreen(viewport, getAppsForProfile(getActiveProfileId()), shellContext.navigate);
      return;
    }

    const app = getAppById(route);
    if (!app) {
      shellContext.navigate(HOME_ROUTE);
      return;
    }

    document.title = `${app.title} · Home Hub`;
    appTitle.textContent = app.title;
    app.mount(viewport, shellContext);
  };

  homeButton.addEventListener('click', () => shellContext.navigate(HOME_ROUTE));

  subscribeToRoute(renderRoute);
  initRouter(getAppById);
}

export { navigate, HOME_ROUTE };
