import { defineApp } from '../../components/App/defineApp.js';
import { createComingSoonView } from '../placeholder.js';

export const binsApp = defineApp({
  id: 'bins',
  title: 'Bin Collection',
  iconId: 'trash-2',
  description: 'Recycling and rubbish collection days',
  capabilities: ['schedule', 'reminders'],
  accent: '#28d17c',
  profiles: ['owner', 'housesitter'],
  summary: () => ({ title: 'Thursday', subtitle: 'Next collection' }),
  mount(viewport) {
    viewport.replaceChildren(createComingSoonView('Bin Collection'));
  }
});
