import { renderModeHomeScreen } from '../apps/Home/renderModeHome.js';
import { getAppById } from '../services/appRegistry.js';
import { getVisibleApps, isAppVisible } from '../services/appVisibility.js';
import { getModeConfig, getAppDisplayTitle } from '../modes/modeConfig.js';
import { applyShellBranding } from './shellBranding.js';
import { mountShellBottomNav, syncShellBottomNav } from './bottomNav.js';
import { getCurrentRoute, HOME_ROUTE, initRouter, navigate, subscribeToRoute } from './router.js';
import { subscribeToProfileChange } from '../services/profileService.js';
import { subscribeToUserMode } from '../auth/userMode.js';

/**
 * @param {Object} options
 * @param {HTMLElement} options.viewport
 * @param {HTMLElement} options.homeWelcome
 * @param {HTMLElement} options.shellEyebrow
 * @param {HTMLElement} options.shellChromeTitle
 * @param {HTMLElement} options.homeButton
 * @param {HTMLElement} options.statusStrip
 * @param {HTMLElement} options.shellFooter
 * @param {HTMLElement} options.shellTagline
 * @param {import('../types/app.js').ShellContext} options.shellContext
 */
export function createAppShell({
  viewport,
  homeWelcome,
  shellEyebrow,
  shellChromeTitle,
  homeButton,
  statusStrip,
  shellFooter,
  shellTagline,
  bottomNav,
  shellContext
}) {
  applyShellBranding({ shellEyebrow, shellTagline });

  /** @param {string} route */
  const renderRoute = (route) => {
    viewport.classList.remove('is-active');
    void viewport.offsetWidth;
    viewport.classList.add('is-active');

    const mode = getModeConfig();
    const isHome = route === HOME_ROUTE;
    homeWelcome.hidden = !isHome || !mode.showHomeWelcomeGreeting;
    statusStrip.hidden = !isHome || !mode.showOwnerStatusStrip;
    shellFooter.hidden = route !== 'controls' || !mode.showControlsFooter;
    document.body.classList.toggle('mode-house-sitter', Boolean(mode.bottomNav?.length));

    const branding = mode.branding;
    shellChromeTitle.textContent = isHome
      ? branding.homeChromeTitle
      : getAppDisplayTitle(getAppById(route) ?? { id: '', title: branding.homeChromeTitle });
    if (shellTagline) {
      shellTagline.hidden = !(isHome && branding.homeTagline);
      if (!shellTagline.hidden) shellTagline.textContent = branding.homeTagline ?? '';
    }
    homeButton.hidden = Boolean(mode.bottomNav?.length && isHome);
    homeButton.textContent = isHome ? 'Home' : '← Home';
    homeButton.setAttribute('aria-current', isHome ? 'page' : 'false');

    mountShellBottomNav(bottomNav, (target) => shellContext.navigate(target));
    syncShellBottomNav(bottomNav);

    if (isHome) {
      document.title = branding.documentTitleBase;
      document.body.classList.remove('is-weather-route');
      void renderModeHomeScreen(viewport, getVisibleApps(), shellContext);
      return;
    }

    if (!isAppVisible(route)) {
      shellContext.navigate(HOME_ROUTE);
      return;
    }

    const app = getAppById(route);
    if (!app) {
      shellContext.navigate(HOME_ROUTE);
      return;
    }

    document.title = `${getAppDisplayTitle(app)} · ${branding.documentTitleBase}`;
    document.body.classList.toggle('is-weather-route', route === 'weather');
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
  subscribeToUserMode(() => {
    applyShellBranding({ shellEyebrow, shellTagline });
    renderRoute(getCurrentRoute());
  });
  initRouter(getAppById);
}

export { navigate, HOME_ROUTE };
