import { renderModeHomeScreen } from '../apps/Home/renderModeHome.js';
import { getAppById } from '../services/appRegistry.js';
import { getVisibleApps, isAppVisible } from '../services/appVisibility.js';
import { getModeConfig, getAppDisplayTitle } from '../modes/modeConfig.js';
import { getHubDisplayName, subscribeToSiteProfile } from '../services/siteProfileService.js';
import { applyShellBranding } from './shellBranding.js';
import { mountShellBottomNav, syncShellBottomNav } from './bottomNav.js';
import { getCurrentRoute, HOME_ROUTE, initRouter, navigate, subscribeToRoute } from './router.js';
import { initProfileSwitcher } from './profileSwitcher.js';
import { subscribeToProfileChange } from '../services/profileService.js';
import { subscribeToUserMode } from '../auth/userMode.js';
import { subscribeToDisplayPreferences } from '../services/displayPreferencesService.js';
import { syncShellClockPlacement } from './shellClockPlacement.js';
import { syncShellBrandLogoRoute } from './shellBrandLogo.js';
import { subscribeToSitterControls } from '../services/sitterControlsService.js';
import { renderIcon } from '../components/icons/renderIcon.js';

/**
 * @param {Object} options
 * @param {HTMLElement} options.viewport
 * @param {HTMLElement | null} [options.shellHomeHero]
 * @param {HTMLElement | null} [options.homeGreeting]
 * @param {HTMLElement} options.shellEyebrow
 * @param {HTMLElement} options.shellChromeTitle
 * @param {HTMLElement} options.statusStrip
 * @param {HTMLElement | null} [options.shellHeaderWeather]
 * @param {HTMLElement} options.shellFooter
 * @param {HTMLElement} options.shellTagline
 * @param {HTMLElement | null} [options.shellProfileSwitcher]
 * @param {import('../types/app.js').ShellContext} options.shellContext
 */
export function createAppShell({
  viewport,
  shellHomeHero,
  homeGreeting,
  shellEyebrow,
  shellChromeTitle,
  statusStrip,
  shellHeaderWeather,
  shellFooter,
  shellTagline,
  bottomNav,
  shellProfileSwitcher,
  shellContext
}) {
  applyShellBranding({ shellEyebrow, shellTagline });

  const shellHomeLink = ensureShellHomeLink(shellContext);

  if (shellProfileSwitcher) {
    initProfileSwitcher(shellProfileSwitcher, {
      onChange: () => {
        shellContext.navigate(HOME_ROUTE, { force: true });
        shellContext.refreshShell?.();
      }
    });
  }

  /** @type {string | null} */
  let lastMountedAppRoute = null;

  /**
   * @param {ParentNode} host
   */
  function disposeMountedHouseGuide(host) {
    const root = host.querySelector('.house-guide-interactive');
    const dispose = /** @type {{ houseGuideDispose?: () => void } | null} */ (root)?.houseGuideDispose;
    dispose?.();
  }

  /** @param {string} route
   * @param {{ forceRemount?: boolean }} [options]
   */
  const renderRoute = (route, options = {}) => {
    viewport.classList.remove('is-active');
    void viewport.offsetWidth;
    viewport.classList.add('is-active');

    const mode = getModeConfig();
    const isHome = route === HOME_ROUTE;
    const showHomeHero = isHome && (mode.showHomeWelcomeGreeting || mode.showHomeDate);
    if (shellHomeHero) shellHomeHero.hidden = !showHomeHero;
    if (homeGreeting) {
      homeGreeting.hidden = !isHome || !mode.showHomeWelcomeGreeting;
    }
    statusStrip.hidden = !isHome || !mode.showOwnerStatusStrip;
    if (shellHeaderWeather) {
      shellHeaderWeather.hidden = !isHome || !mode.showSitterHeaderWeather;
    }
    shellFooter.hidden = route !== 'controls' || !mode.showControlsFooter;
    document.body.classList.toggle('mode-house-sitter', Boolean(mode.bottomNav?.length));
    document.body.classList.toggle('shell-route-home', isHome);

    const branding = mode.branding;
    const hubName = getHubDisplayName();
    shellChromeTitle.textContent = isHome
      ? hubName
      : getAppDisplayTitle(getAppById(route) ?? { id: '', title: hubName });
    if (shellTagline) {
      shellTagline.hidden = !(isHome && branding.homeTagline);
      if (!shellTagline.hidden) shellTagline.textContent = branding.homeTagline ?? '';
    }
    syncShellClockPlacement(route, mode);
    syncShellBrandLogoRoute(isHome);
    syncShellHomeLink(shellHomeLink, isHome);

    mountShellBottomNav(bottomNav, (target) => {
      if (target === getCurrentRoute()) {
        renderRoute(target, { forceRemount: true });
        return;
      }
      shellContext.navigate(target);
    });
    syncShellBottomNav(bottomNav);

    if (isHome) {
      document.title = hubName;
      document.body.classList.remove('is-weather-route', 'is-bins-route');
      lastMountedAppRoute = HOME_ROUTE;
      void renderModeHomeScreen(viewport, getVisibleApps(), shellContext);
      return;
    }

    if (route === 'house-guide' && lastMountedAppRoute === 'house-guide' && !options.forceRemount) {
      syncShellBottomNav(bottomNav);
      const app = getAppById(route);
      if (app) {
        document.title = `${getAppDisplayTitle(app)} · ${hubName}`;
      }
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

    document.title = `${getAppDisplayTitle(app)} · ${hubName}`;
    document.body.classList.remove('is-weather-route', 'is-bins-route');
    if (route === 'weather') document.body.classList.add('is-weather-route');
    if (route === 'bins') document.body.classList.add('is-bins-route');
    disposeMountedHouseGuide(viewport);
    /** @type {HTMLElement & { scooterGuideDispose?: () => void }} */ (viewport).scooterGuideDispose?.();
    /** @type {HTMLElement & { scooterGuideDispose?: () => void }} */ (viewport).scooterGuideDispose =
      undefined;
    app.mount(viewport, shellContext);
    lastMountedAppRoute = route;
  };

  shellContext.refreshShell = () => {
    renderRoute(getCurrentRoute(), { forceRemount: true });
  };

  subscribeToRoute(renderRoute);
  subscribeToProfileChange(() => {
    renderRoute(getCurrentRoute());
  });
  subscribeToUserMode(() => {
    applyShellBranding({ shellEyebrow, shellTagline });
    renderRoute(getCurrentRoute(), { forceRemount: true });
  });
  subscribeToSitterControls(() => {
    const route = getCurrentRoute();
    if (route === HOME_ROUTE || route === 'controls') {
      renderRoute(route, { forceRemount: true });
    }
  });
  subscribeToDisplayPreferences(() => {
    if (getCurrentRoute() === HOME_ROUTE) {
      renderRoute(HOME_ROUTE);
    }
  });
  subscribeToSiteProfile(() => {
    applyShellBranding({ shellEyebrow, shellTagline });
    const route = getCurrentRoute();
    if (route === HOME_ROUTE) {
      // Home launcher visibility (e.g. Getting ready) depends on profile fields loaded async.
      renderRoute(HOME_ROUTE, { forceRemount: true });
      return;
    }
    const hubName = getHubDisplayName();
    shellChromeTitle.textContent = getAppDisplayTitle(getAppById(route) ?? { id: '', title: hubName });
  });
  initRouter(getAppById);
}

/**
 * @param {import('../types/app.js').ShellContext} shellContext
 */
function ensureShellHomeLink(shellContext) {
  const brandRow = document.querySelector('.shell-chrome-brand-row');
  let link = document.querySelector('#shell-home-link');
  if (!(link instanceof HTMLButtonElement) && brandRow) {
    link = document.createElement('button');
    link.type = 'button';
    link.id = 'shell-home-link';
    link.className = 'shell-home-link';
    link.hidden = true;

    const icon = document.createElement('span');
    icon.className = 'shell-home-link-icon';
    icon.append(renderIcon('home', { size: 18, className: 'shell-home-link-svg' }));

    const label = document.createElement('span');
    label.className = 'shell-home-link-label';
    label.textContent = 'Home';

    link.append(icon, label);
    link.addEventListener('click', () => shellContext.navigate(HOME_ROUTE));
    brandRow.append(link);
  }
  return link instanceof HTMLButtonElement ? link : null;
}

/**
 * @param {HTMLButtonElement | null} link
 * @param {boolean} isHome
 */
function syncShellHomeLink(link, isHome) {
  if (!link) return;
  link.hidden = isHome;
  const logoButton = document.querySelector('#shell-logo-button');
  if (logoButton instanceof HTMLButtonElement) {
    logoButton.setAttribute(
      'aria-label',
      isHome ? 'Home' : 'Logo — tap to go home, or use the Home button'
    );
  }
}

export { navigate, HOME_ROUTE };
