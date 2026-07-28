import { CONFIG } from '../config.js';
import { initialiseBattery } from './modules/battery.js';
import { renderButtons } from './modules/buttons.js';
import { startClock } from './modules/clock.js';
import { watchNetwork } from './modules/network.js';
import { showToast } from './modules/toast.js';
import { triggerVirtualButton } from './modules/virtualButtons.js';
import { initialiseWeather } from './modules/weather.js';
import { formatTime } from './utils/format.js';

const elements = {
  greeting: document.querySelector('#greeting'),
  date: document.querySelector('#date'),
  clock: document.querySelector('#clock'),
  seconds: document.querySelector('#seconds'),
  grid: document.querySelector('#button-grid'),
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

async function handleTrigger(button, element) {
  if (!navigator.onLine) {
    showToast(elements.toast, 'You are offline');
    return;
  }
  element.classList.add('is-pressing');
  navigator.vibrate?.(35);
  try {
    await triggerVirtualButton({ accessCode: CONFIG.accessCode, buttonId: button.id });
    showToast(elements.toast, `✓ ${button.title} activated`);
    elements.lastCommand.textContent = `${button.title} · ${formatTime(new Date())}`;
  } catch (error) {
    console.error(error);
    showToast(elements.toast, error.message);
  } finally {
    window.setTimeout(() => element.classList.remove('is-pressing'), 180);
  }
}

function registerServiceWorker() {
  // A service worker should not control Vite's development server because it can
  // cache stale HTML, CSS and transformed JavaScript modules.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  }
}

startClock(elements);
watchNetwork(elements.network);
renderButtons(elements.grid, CONFIG.buttons, handleTrigger);
initialiseBattery(elements.battery);
initialiseWeather(elements.weather, CONFIG.weather);
registerServiceWorker();
