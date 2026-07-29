import { defineApp } from '../../components/App/defineApp.js';
import { getBinCollectionSummary, getUpcomingBinCollection } from '../../services/binCollectionService.js';
import { openHouseGuideTopic } from '../../services/guideNavigation.js';

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
function mountBinsApp(viewport, context) {
  viewport.replaceChildren();
  const page = document.createElement('section');
  page.className = 'app-page bins-app';
  page.setAttribute('aria-label', 'Bin Collection');

  const next = getUpcomingBinCollection();
  const card = document.createElement('div');
  card.className = 'bins-status-card';
  card.innerHTML = `<p class="bins-status-emoji">${next.emoji}</p><h2 class="bins-status-title">${next.label}</h2><p class="bins-status-when">${next.relative}</p>`;

  const detail = document.createElement('p');
  detail.className = 'bins-status-detail subtle';
  detail.textContent =
    'Collections are fortnightly on alternate weeks. Wheel the correct bin to the end of the road the evening before.';

  const guide = document.createElement('button');
  guide.type = 'button';
  guide.className = 'bins-guide-link';
  guide.textContent = 'More about bins and recycling';
  guide.addEventListener('click', () => openHouseGuideTopic(context, 'rubbish-recycling'));

  page.append(card, detail, guide);
  viewport.append(page);
}

export const binsApp = defineApp({
  id: 'bins',
  title: 'Bin Collection',
  iconId: 'trash-2',
  description: 'Recycling and rubbish collection days',
  capabilities: ['schedule', 'reminders'],
  accent: '#28d17c',
  profiles: ['owner', 'housesitter'],
  summary: () => getBinCollectionSummary(),
  mount: mountBinsApp
});
