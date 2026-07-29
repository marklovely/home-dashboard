import { definePlaceholderApp } from '../placeholder.js';
import { registerApp } from '../../services/appRegistry.js';

registerApp(
  definePlaceholderApp({
    id: 'calendar',
    title: 'Calendar',
    icon: '📅',
    accent: '#6f7b8f',
    profiles: ['owner', 'housesitter']
  })
);
