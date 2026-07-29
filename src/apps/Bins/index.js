import { definePlaceholderApp } from '../placeholder.js';
import { registerApp } from '../../services/appRegistry.js';

registerApp(
  definePlaceholderApp({
    id: 'bins',
    title: 'Bin Collection',
    icon: '🗑',
    accent: '#28d17c',
    profiles: ['owner', 'housesitter']
  })
);
