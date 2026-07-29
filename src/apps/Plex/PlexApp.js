import { defineApp } from '../../components/App/defineApp.js';
import { createComingSoonView } from '../placeholder.js';

export const plexApp = defineApp({
  id: 'plex',
  title: 'Plex',
  iconId: 'clapperboard',
  description: 'Browse and play media',
  capabilities: ['media', 'streaming'],
  accent: '#d16dff',
  profiles: ['owner'],
  summary: () => ({ title: 'Coming Soon', subtitle: 'Media hub' }),
  mount(viewport) {
    viewport.replaceChildren(createComingSoonView('Plex'));
  }
});
