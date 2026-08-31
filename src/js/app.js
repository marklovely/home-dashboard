import { CONFIG } from '../config/resolveHubConfig.js';
import { initialiseHeader } from '../components/Header/Header.js';
import { createAppShell, HOME_ROUTE, navigate } from '../shell/AppShell.js';
import { getCurrentRoute } from '../shell/router.js';
import { subscribeWeatherSnapshot } from '../services/homeWeatherSnapshot.js';
import { initialiseBattery } from './modules/battery.js';
import { watchNetwork } from './modules/network.js';
import { initialiseWeather } from './modules/weather.js';
import { initTheme } from '../services/themeService.js';
import { initDisplayPreferences } from '../services/displayPreferencesService.js';
import { initScreensaverService } from '../services/screensaverService.js';
import { initWeatherLocationPreference, getWeatherLocationOverride } from '../services/weatherLocationService.js';
import { syncWeatherLocationFromPropertyAddress } from '../services/weatherLocationFromProfile.js';
import '../apps/index.js';
import '../widgets/index.js';
import { preloadPrivateConfig } from '../services/privateConfigService.js';
import { isHouseSitterExperience } from '../auth/userMode.js';
import { attachOwnerAccessGesture } from '../auth/ownerAccessGesture.js';
import { registerOwnerLockNavigation } from '../auth/ownerLock.js';
import { startMyDayCalendarService } from '../services/myDayCalendarService.js';
import { bootstrapDeviceSession, getDeviceSessionStatus } from '../auth/deviceSessionStore.js';
import { startDeviceSessionKeepalive } from '../auth/deviceSessionKeepalive.js';
import { initAccessSessionBanner } from '../shell/accessSessionBanner.js';
import { initScreensaverOverlay } from '../shell/screensaverOverlay.js';
import { initTestEnvironmentBanner } from '../shell/testEnvironmentBanner.js';
import { initTrialWatermark } from '../shell/trialWatermark.js';
import { initShellBrandLogo } from '../shell/shellBrandLogo.js';
import { applyShellBranding } from '../shell/shellBranding.js';
import { subscribeToSiteProfile } from '../services/siteProfileService.js';
import {
  initTabletPreferencesSync,
  syncTabletPreferencesFromSiteProfile
} from '../services/tabletPreferencesSyncService.js';
import { initHubSetupRoutePolicy } from '../apps/HubSetup/hubSetupRoutePolicy.js';
import { isControlsConfigured } from '../services/environmentAppPolicy.js';
import { refreshGuideContent } from '../services/guideContentService.js';
import { refreshApplianceManuals } from '../services/applianceManualsService.js';

initTheme();
initDisplayPreferences();
initScreensaverService();
initTabletPreferencesSync();
initWeatherLocationPreference();

const loadingOverlay = document.querySelector('#device-session-loading');
const hubShell = document.querySelector('.hub-shell');

function setStartupLoading(active) {
  if (loadingOverlay) {
    loadingOverlay.hidden = !active;
  }
  if (hubShell) {
    hubShell.classList.toggle('hub-shell--session-loading', active);
  }
}

async function initialiseDashboard() {
  void initTestEnvironmentBanner();
  void initTrialWatermark();
  void preloadPrivateConfig();
  if (!isHouseSitterExperience()) {
    startMyDayCalendarService();
  }

  const networkHint = document.querySelector('#network-hint');
  if (networkHint) {
    if (isHouseSitterExperience()) {
      networkHint.textContent = 'Connected';
    } else if (isControlsConfigured(CONFIG)) {
      networkHint.textContent = 'Home controls ready';
    } else {
      networkHint.textContent = 'Hub online';
    }
  }

  const elements = {
    greeting: document.querySelector('#greeting'),
    date: document.querySelector('#date'),
    clock: document.querySelector('#clock'),
    seconds: document.querySelector('#seconds'),
    toast: document.querySelector('#toast'),
    lastCommand: document.querySelector('#last-command'),
    network: {
      dot: document.querySelector('#network-dot'),
      label: document.querySelector('#network-label')
    },
    battery: {
      level: document.querySelector('#battery-level'),
      state: document.querySelector('#battery-state')
    },
    weather: {
      icon: document.querySelector('#weather-icon'),
      temp: document.querySelector('#weather-temp'),
      text: document.querySelector('#weather-text')
    }
  };

  function registerServiceWorker() {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('./service-worker.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'skip-waiting' });
            }
          });
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          registration.waiting.postMessage({ type: 'skip-waiting' });
        }
      })
      .catch(console.error);
  }

  const shellContext = {
    config: CONFIG,
    toast: elements.toast,
    lastCommand: elements.lastCommand,
    navigate(appId, options = {}) {
      navigate(appId === HOME_ROUTE ? HOME_ROUTE : appId, options);
    }
  };

  initialiseHeader(elements);
  watchNetwork(elements.network);
  initialiseBattery(elements.battery);
  initialiseWeather(elements.weather, CONFIG.weather, {
    headerElements: {
      icon: document.querySelector('#shell-weather-icon'),
      temp: document.querySelector('#shell-weather-temp'),
      text: document.querySelector('#shell-weather-text')
    },
    heroElements: {
      icon: document.querySelector('#shell-hero-weather-icon'),
      temp: document.querySelector('#shell-hero-weather-temp'),
      text: document.querySelector('#shell-hero-weather-condition'),
      condition: document.querySelector('#shell-hero-weather-condition')
    }
  });

  const versionLabel = document.querySelector('#shell-version-label');
  if (versionLabel && typeof __APP_VERSION__ !== 'undefined') {
    versionLabel.hidden = false;
    versionLabel.textContent = `Home Hub v${__APP_VERSION__}`;
  }

  createAppShell({
    viewport: document.querySelector('#app-viewport'),
    shellHomeHero: document.querySelector('#shell-home-hero'),
    homeGreeting: document.querySelector('#greeting'),
    shellEyebrow: document.querySelector('#shell-eyebrow'),
    shellChromeTitle: document.querySelector('#shell-chrome-title'),
    shellTagline: document.querySelector('#shell-tagline'),
    statusStrip: document.querySelector('#shell-status'),
    shellHeaderWeather: document.querySelector('#shell-header-weather'),
    shellFooter: document.querySelector('#shell-footer'),
    bottomNav: document.querySelector('#shell-bottom-nav'),
    shellProfileSwitcher: document.querySelector('#shell-profile-switcher'),
    shellContext
  });

  const homeWeatherButton = document.querySelector('#shell-home-weather');
  if (homeWeatherButton instanceof HTMLButtonElement) {
    homeWeatherButton.addEventListener('click', () => shellContext.navigate('weather'));
  }

  registerOwnerLockNavigation(() => {
    navigate(HOME_ROUTE);
    shellContext.refreshShell?.();
  });

  attachOwnerAccessGesture({
    logoElements: [
      document.querySelector('#shell-logo-button'),
      document.querySelector('#shell-chrome-title'),
      document.querySelector('.shell-chrome-title-block')
    ],
    holdFeedbackElement: document.querySelector('.shell-chrome-title-block'),
    dialogHost: document.querySelector('#owner-access-host'),
    onOwnerUnlocked: () => shellContext.refreshShell?.()
  });

  subscribeWeatherSnapshot(() => {
    if (getCurrentRoute() === HOME_ROUTE) {
      shellContext.refreshShell?.();
    }
  });

  registerServiceWorker();
  initScreensaverOverlay();
  initShellBrandLogo({
    onNavigateHome: () => shellContext.navigate(HOME_ROUTE)
  });

  subscribeToSiteProfile(() => {
    applyShellBranding({
      shellEyebrow: document.querySelector('#shell-eyebrow'),
      shellTagline: document.querySelector('#shell-tagline')
    });
  });

  void syncTabletPreferencesFromSiteProfile().then((state) => {
    if (!getWeatherLocationOverride() && state?.profile?.propertyAddress) {
      void syncWeatherLocationFromPropertyAddress(state.profile.propertyAddress);
    }
    initHubSetupRoutePolicy();
  });

  // Prefetch published guide content so sitter apps are not empty while the catalog loads.
  void refreshGuideContent(fetch, { draft: false });
  void refreshApplianceManuals(fetch, { owner: false });
}

setStartupLoading(true);
void bootstrapDeviceSession()
  .catch((error) => {
    console.warn('Device session bootstrap failed:', error);
  })
  .finally(() => {
    setStartupLoading(false);
    if (getDeviceSessionStatus() === 'error') {
      console.warn('Device session could not be verified; staying on owner mode until Access succeeds.');
    }
    try {
      void initialiseDashboard();
      startDeviceSessionKeepalive();
      initAccessSessionBanner();
    } catch (error) {
      console.error('Dashboard failed to start:', error);
      if (loadingOverlay) {
        loadingOverlay.textContent = 'Something went wrong loading the dashboard. Try a hard refresh.';
        loadingOverlay.hidden = false;
      }
    }
  });
