import { CONFIG } from '../config.js';
import { initialiseHeader } from '../components/Header/Header.js';
import { createAppShell, HOME_ROUTE, navigate } from '../shell/AppShell.js';
import { getCurrentRoute } from '../shell/router.js';
import { subscribeWeatherSnapshot } from '../services/homeWeatherSnapshot.js';
import { initialiseBattery } from './modules/battery.js';
import { watchNetwork } from './modules/network.js';
import { initialiseWeather } from './modules/weather.js';
import { initTheme } from '../services/themeService.js';
import '../apps/index.js';
import '../widgets/index.js';
import { preloadPrivateConfig } from '../services/privateConfigService.js';

initTheme();
void preloadPrivateConfig();

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
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  }
}

const shellContext = {
  config: CONFIG,
  toast: elements.toast,
  lastCommand: elements.lastCommand,
  navigate(appId) {
    navigate(appId === HOME_ROUTE ? HOME_ROUTE : appId);
  }
};

initialiseHeader(elements);
watchNetwork(elements.network);
initialiseBattery(elements.battery);
initialiseWeather(elements.weather, CONFIG.weather);

const versionLabel = document.querySelector('#shell-version-label');
if (versionLabel && typeof __APP_VERSION__ !== 'undefined') {
  versionLabel.textContent = `Home Hub v${__APP_VERSION__}`;
}

createAppShell({
  viewport: document.querySelector('#app-viewport'),
  homeWelcome: document.querySelector('#shell-home-welcome'),
  shellChromeTitle: document.querySelector('#shell-chrome-title'),
  homeButton: document.querySelector('#shell-home-button'),
  statusStrip: document.querySelector('#shell-status'),
  shellFooter: document.querySelector('#shell-footer'),
  shellContext
});

subscribeWeatherSnapshot(() => {
  if (getCurrentRoute() === HOME_ROUTE) {
    shellContext.refreshShell?.();
  }
});

registerServiceWorker();
