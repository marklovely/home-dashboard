import { defineApp } from '../../components/App/defineApp.js';
import { createComingSoonView } from '../placeholder.js';

export const scooterApp = defineApp({
  id: 'scooter',
  title: 'Scooter',
  iconId: 'dog',
  description: 'Dog care schedule and notes',
  capabilities: ['pets', 'schedule'],
  accent: '#ff9f43',
  profiles: ['owner', 'housesitter'],
  summary: () => ({ title: 'Nothing due today', subtitle: 'Walks & feeding' }),
  mount(viewport) {
    viewport.replaceChildren(createComingSoonView('Scooter'));
  }
});
