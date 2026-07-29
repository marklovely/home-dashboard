import { definePlaceholderApp } from '../placeholder.js';
import { registerApp } from '../../services/appRegistry.js';

registerApp(
  definePlaceholderApp({
    id: 'weather',
    title: 'Weather',
    icon: '🌤',
    accent: '#4da8ff',
    profiles: ['owner', 'housesitter']
  })
);
