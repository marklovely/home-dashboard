import { definePlaceholderApp } from '../placeholder.js';
import { registerApp } from '../../services/appRegistry.js';

registerApp(
  definePlaceholderApp({
    id: 'plex',
    title: 'Plex',
    icon: '🎬',
    accent: '#d16dff',
    profiles: ['owner', 'housesitter']
  })
);
