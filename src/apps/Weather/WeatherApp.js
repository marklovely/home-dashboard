import { defineApp } from '../../components/App/defineApp.js';
import { getWeatherSnapshot } from '../../services/homeWeatherSnapshot.js';
import { createComingSoonView } from '../placeholder.js';

export const weatherApp = defineApp({
  id: 'weather',
  title: 'Weather',
  iconId: 'cloud-sun',
  description: 'Forecast and current conditions',
  capabilities: ['forecast', 'current-conditions'],
  accent: '#4da8ff',
  profiles: ['owner', 'housesitter'],
  summary: () => getWeatherSnapshot(),
  mount(viewport) {
    viewport.replaceChildren(createComingSoonView('Weather'));
  }
});
