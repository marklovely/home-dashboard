import { definePlaceholderApp } from '../placeholder.js';
import { registerApp } from '../../services/appRegistry.js';

registerApp(
  definePlaceholderApp({
    id: 'settings',
    title: 'Settings',
    icon: '⚙',
    accent: '#aeb7c6',
    profiles: ['owner', 'housesitter']
  })
);
