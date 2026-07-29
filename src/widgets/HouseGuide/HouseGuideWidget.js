import { defineWidget } from '../../components/Widget/defineWidget.js';
import { getGuidePage, listGuideTopics, searchGuideTopics } from '../../services/guideService.js';
import { renderGuideCategoryCard, renderGuideTopicPage } from './guidePageRenderer.js';

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
function createInteractiveHouseGuide(context) {
  const root = document.createElement('section');
  root.className = 'widget-panel house-guide house-guide-interactive';
  root.setAttribute('aria-label', 'House guide');

  const exploreView = document.createElement('div');
  exploreView.className = 'house-guide-explore';

  const intro = document.createElement('div');
  intro.className = 'house-guide-intro';
  const introTitle = document.createElement('h2');
  introTitle.className = 'house-guide-intro-title';
  introTitle.textContent = 'Explore the home';
  const introText = document.createElement('p');
  introText.className = 'house-guide-intro-text';
  introText.textContent = 'Choose a room or topic, or ask a question below.';
  intro.append(introTitle, introText);

  const searchWrap = document.createElement('div');
  searchWrap.className = 'house-guide-search';
  const searchLabel = document.createElement('label');
  searchLabel.className = 'guide-search-label';
  searchLabel.setAttribute('for', 'house-guide-search');
  searchLabel.textContent = 'What do you need help with?';
  const searchInput = document.createElement('input');
  searchInput.id = 'house-guide-search';
  searchInput.className = 'guide-search-input';
  searchInput.type = 'search';
  searchInput.placeholder = 'Try heating, Wi-Fi, television…';
  searchInput.setAttribute('autocomplete', 'off');
  searchInput.setAttribute('enterkeyhint', 'search');
  const searchStatus = document.createElement('p');
  searchStatus.className = 'guide-search-status subtle';
  searchStatus.setAttribute('aria-live', 'polite');
  searchWrap.append(searchLabel, searchInput, searchStatus);

  const tileGrid = document.createElement('div');
  tileGrid.className = 'guide-category-grid';
  tileGrid.setAttribute('role', 'list');

  exploreView.append(intro, tileGrid, searchWrap);

  const topicHost = document.createElement('div');
  topicHost.className = 'house-guide-topic-host';
  topicHost.hidden = true;
  topicHost.inert = true;

  root.append(exploreView, topicHost);

  /** @type {Map<string, HTMLElement>} */
  const cardsById = new Map();

  function rebuildCards(topics, query = '') {
    tileGrid.replaceChildren();
    cardsById.clear();
    for (const topic of topics) {
      const card = renderGuideCategoryCard(topic, () => openTopic(topic.id), query);
      card.setAttribute('role', 'listitem');
      cardsById.set(topic.id, card);
      tileGrid.append(card);
    }
  }

  function applySearch() {
    const query = searchInput.value;
    const topics = searchGuideTopics(query);
    rebuildCards(topics, query);

    if (!query.trim()) {
      searchStatus.textContent = '';
      return;
    }

    if (topics.length === 0) {
      searchStatus.textContent = 'No matches — try heating, Wi-Fi, or television.';
      return;
    }

    if (topics.length === 1) {
      searchStatus.textContent = `Showing ${topics[0].title}`;
      return;
    }

    searchStatus.textContent = `${topics.length} topics match your search.`;
  }

  function showExplore() {
    topicHost.hidden = true;
    topicHost.inert = true;
    topicHost.replaceChildren();
    exploreView.hidden = false;
    exploreView.inert = false;
    searchInput.focus();
  }

  function openTopic(topicId) {
    const page = getGuidePage(topicId);
    if (!page) return;

    exploreView.hidden = true;
    exploreView.inert = true;
    topicHost.hidden = false;
    topicHost.inert = false;
    topicHost.replaceChildren(
      renderGuideTopicPage(
        page,
        context,
        showExplore,
        openTopic
      )
    );
  }

  searchInput.addEventListener('input', applySearch);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const best = searchGuideTopics(searchInput.value)[0];
    if (best) {
      event.preventDefault();
      openTopic(best.id);
    }
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !topicHost.hidden) {
      event.preventDefault();
      showExplore();
    }
  });

  rebuildCards(listGuideTopics());
  return root;
}

export const houseGuideWidget = defineWidget({
  id: 'house-guide',
  layout: 'panel',
  profiles: ['owner', 'housesitter'],
  mount(context) {
    return createInteractiveHouseGuide(context);
  }
});
