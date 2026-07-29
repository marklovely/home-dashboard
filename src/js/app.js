import { CONFIG } from '../config.js';
import { initialiseHeader } from '../components/Header/Header.js';
import { mountDashboardWidgets } from '../components/WidgetGrid/WidgetGrid.js';
import { initialiseBattery } from './modules/battery.js';
import { watchNetwork } from './modules/network.js';
import { initialiseWeather } from './modules/weather.js';
import { getActiveProfileId } from '../services/profileService.js';
import { getWidgetsForProfile } from '../services/widgetRegistry.js';
import '../widgets/index.js';

const elements = {
  greeting: document.querySelector('#greeting'),
  date: document.querySelector('#date'),
  clock: document.querySelector('#clock'),
  seconds: document.querySelector('#seconds'),
  grid: document.querySelector('#alexa-grid'),
  widgetPanels: document.querySelector('#widget-panels'),
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
  // A service worker should not control Vite's development server because it can
  // cache stale HTML, CSS and transformed JavaScript modules.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  }
}

const widgetContext = {
  config: CONFIG,
  toast: elements.toast,
  lastCommand: elements.lastCommand
};

initialiseHeader(elements);
watchNetwork(elements.network);
mountDashboardWidgets(
  elements.grid,
  elements.widgetPanels,
  getWidgetsForProfile(getActiveProfileId()),
  widgetContext
);
initialiseBattery(elements.battery);
initialiseWeather(elements.weather, CONFIG.weather);
registerServiceWorker();
