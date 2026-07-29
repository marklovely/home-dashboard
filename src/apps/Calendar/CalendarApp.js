import { defineApp } from '../../components/App/defineApp.js';
import { createComingSoonView } from '../placeholder.js';

export const calendarApp = defineApp({
  id: 'calendar',
  title: 'Calendar',
  iconId: 'calendar',
  description: 'Household calendar and events',
  capabilities: ['schedule', 'events'],
  accent: '#6f7b8f',
  profiles: ['owner', 'housesitter'],
  summary: () => ({ title: 'Coming Soon', subtitle: 'Shared calendar' }),
  mount(viewport) {
    viewport.replaceChildren(createComingSoonView('Calendar'));
  }
});
