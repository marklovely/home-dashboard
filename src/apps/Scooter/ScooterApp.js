import { defineApp } from '../../components/App/defineApp.js';
import { getPetDisplayName } from '../../lib/petDisplayName.js';
import { getGuideTopic } from '../../services/guideService.js';
import { subscribeToGuideContent } from '../../services/guideContentService.js';
import { resolveGuideMedia } from '../../content/houseguide/guideMedia.js';
import { renderGuideTopicPage } from '../../widgets/HouseGuide/guidePageRenderer.js';

/** @typedef {{ id: string, title: string, emoji: string, topicId: string, hint: string }} ScooterSection */

/** @type {ScooterSection[]} */
export const SCOOTER_SECTIONS = [
  {
    id: 'morning',
    title: 'Morning',
    emoji: '🌅',
    topicId: 'morning-routine',
    hint: 'Out of the crate, then into the back garden.'
  },
  {
    id: 'walks',
    title: 'Walks',
    emoji: '🐾',
    topicId: 'walks-exercise',
    hint: 'Roads around the house can be busy.'
  },
  {
    id: 'meals',
    title: 'Meals',
    emoji: '🍽',
    topicId: 'feeding',
    hint: 'Morning and evening — food is in the kitchen.'
  },
  {
    id: 'bedtime',
    title: 'Bedtime',
    emoji: '🌙',
    topicId: 'bedtime',
    hint: 'Collar off before the crate — say “It’s bedtime for dogs.”'
  },
  {
    id: 'health',
    title: 'Health',
    emoji: '💊',
    topicId: 'veterinary-help',
    hint: 'Excellent health — no daily medication.'
  },
  {
    id: 'facts',
    title: 'Quick Facts',
    emoji: '📋',
    topicId: 'at-a-glance',
    hint: 'Jack Russell, 5 years, full of energy.'
  }
];

/**
 * @param {ScooterSection} section
 * @param {() => void} onOpen
 */
function createSectionButton(section, onOpen) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scooter-section-card';
  button.innerHTML = `
    <span class="scooter-section-emoji" aria-hidden="true">${section.emoji}</span>
    <span class="scooter-section-title">${section.title}</span>
    <span class="scooter-section-hint">${section.hint}</span>
  `;
  button.addEventListener('click', onOpen);
  return button;
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
export function mountScooterApp(viewport, context) {
  /** @type {HTMLElement & { scooterGuideDispose?: () => void }} */ (viewport).scooterGuideDispose?.();
  viewport.replaceChildren();

  const petName = getPetDisplayName('Pet care');

  const page = document.createElement('section');
  page.className = 'app-page scooter-app';
  page.setAttribute('aria-label', petName);

  const landing = document.createElement('div');
  landing.className = 'scooter-landing';

  const header = document.createElement('header');
  header.className = 'scooter-header';
  const title = document.createElement('h2');
  title.className = 'scooter-title';
  title.textContent = `🐶 ${petName}`;
  const lead = document.createElement('p');
  lead.className = 'scooter-lead';
  lead.textContent = 'Tap a topic for step-by-step care during your stay.';
  header.append(title, lead);

  const grid = document.createElement('div');
  grid.className = 'scooter-section-grid';
  grid.setAttribute('role', 'list');

  const detailHost = document.createElement('div');
  detailHost.className = 'scooter-detail-host';
  detailHost.hidden = true;

  /** @type {ScooterSection | null} */
  let pendingSection = null;

  function showLanding() {
    detailHost.hidden = true;
    detailHost.replaceChildren();
    landing.hidden = false;
    pendingSection = null;
  }

  function openTopic(topicId) {
    const section = SCOOTER_SECTIONS.find((entry) => entry.topicId === topicId);
    if (section) openSection(section);
  }

  function openSection(section) {
    const topic = getGuideTopic(section.topicId);
    if (!topic) {
      pendingSection = section;
      return;
    }
    pendingSection = null;
    landing.hidden = true;
    detailHost.hidden = false;
    detailHost.replaceChildren(
      renderGuideTopicPage(
        topic,
        context,
        showLanding,
        openTopic
      )
    );

    const heroMedia = topic.blocks?.find((block) => block.type === 'heroImage');
    if (heroMedia && heroMedia.type === 'heroImage') {
      const resolved = resolveGuideMedia(heroMedia.mediaId);
      if (resolved.ok) {
        const img = document.createElement('img');
        img.className = 'scooter-detail-hero';
        img.src = resolved.url;
        img.alt = resolved.alt;
        detailHost.prepend(img);
      }
    }
  }

  for (const section of SCOOTER_SECTIONS) {
    const button = createSectionButton(section, () => openSection(section));
    button.setAttribute('role', 'listitem');
    grid.append(button);
  }

  const unsubscribeGuide = subscribeToGuideContent((guideState) => {
    if (guideState.source === 'loading' || guideState.source === 'idle') return;
    if (pendingSection) openSection(pendingSection);
  });
  /** @type {HTMLElement & { scooterGuideDispose?: () => void }} */ (viewport).scooterGuideDispose =
    unsubscribeGuide;

  landing.append(header, grid);
  page.append(landing, detailHost);
  viewport.append(page);
}

export const scooterApp = defineApp({
  id: 'scooter',
  title: 'Pet care',
  iconId: 'dog',
  description: 'Dog care schedule and notes',
  capabilities: ['pets', 'schedule'],
  accent: '#ff9f43',
  profiles: ['housesitter'],
  summary: () => ({ title: 'Care guide', subtitle: 'Walks · meals · bedtime' }),
  mount: mountScooterApp
});
