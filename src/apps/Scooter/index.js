import { definePlaceholderApp } from '../placeholder.js';
import { registerApp } from '../../services/appRegistry.js';

registerApp(
  definePlaceholderApp({
    id: 'scooter',
    title: 'Scooter',
    icon: '🐶',
    accent: '#ff9f43',
    profiles: ['owner', 'housesitter']
  })
);
