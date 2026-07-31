import { renderModeHomeScreen } from '../apps/Home/renderModeHome.js';
import { getAppById } from '../services/appRegistry.js';
import { getVisibleApps, isAppVisible } from '../services/appVisibility.js';
import { getModeConfig, getAppDisplayTitle } from '../modes/modeConfig.js';
import { applyShellBranding } from './shellBranding.js';
import { mountShellBottomNav, syncShellBottomNav } from './bottomNav.js';
import { getCurrentRoute, HOME_ROUTE, initRouter, navigate, subscribeToRoute } from './router.js';
import { initProfileSwitcher } from './profileSwitcher.js';
import { subscribeToProfileChange } from '../services/profileService.js';
import { subscribeToUserMode } from '../auth/userMode.js';
import { subscribeToDisplayPreferences } from '../services/displayPreferencesService.js';

/**
 * @param {Object} options
 * @param {HTMLElement} options.viewport
 * @param {HTMLElement} options.homeWelcome
 * @param {HTMLElement} options.shellEyebrow
 * @param {HTMLElement} options.shellChromeTitle
 * @param {HTMLElement} options.homeButton
 * @param {HTMLElement} options.statusStrip
 * @param {HTMLElement | null} [options.shellHeaderWeather]
 * @param {HTMLElement} options.shellFooter
 * @param {HTMLElement} options.shellTagline
 * @param {HTMLElement | null} [options.shellProfileSwitcher]
 * @param {import('../types/app.js').ShellContext} options.shellContext
 */
export function createAppShell({
  viewport,
  homeWelcome,
  shellEyebrow,
  shellChromeTitle,
  homeButton,
  statusStrip,
  shellHeaderWeather,
  shellFooter,
  shellTagline,
  bottomNav,
  shellProfileSwitcher,
  shellContext
}) {
  applyShellBranding({ shellEyebrow, shellTagline });

  if (shellProfileSwitcher) {
    initProfileSwitcher(shellProfileSwitcher, {
      onChange: () => {
        shellContext.navigate(HOME_ROUTE);
        shellContext.refreshShell?.();
      }
    });
  }

  /** @param {string} route */
  const renderRoute = (route) => {
    viewport.classList.remove('is-active');
    void viewport.offsetWidth;
    viewport.classList.add('is-active');

    const mode = getModeConfig();
    const isHome = route === HOME_ROUTE;
    homeWelcome.hidden = !isHome || !mode.showHomeWelcomeGreeting;
    statusStrip.hidden = !isHome || !mode.showOwnerStatusStrip;
    if (shellHeaderWeather) {
      shellHeaderWeather.hidden = !isHome || !mode.showSitterHeaderWeather;
    }
    shellFooter.hidden = route !== 'controls' || !mode.showControlsFooter;
    document.body.classList.toggle('mode-house-sitter', Boolean(mode.bottomNav?.length));
    document.body.classList.toggle('shell-route-home', isHome);

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
      document.body.classList.remove('is-weather-route', 'is-bins-route');
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
    document.body.classList.remove('is-weather-route', 'is-bins-route');
    if (route === 'weather') document.body.classList.add('is-weather-route');
    if (route === 'bins') document.body.classList.add('is-bins-route');
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
  subscribeToDisplayPreferences(() => {
    if (getCurrentRoute() === HOME_ROUTE) {
      renderRoute(HOME_ROUTE);
    }
  });
  initRouter(getAppById);
}

export { navigate, HOME_ROUTE };
