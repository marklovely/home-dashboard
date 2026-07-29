import { defineWidget } from '../../components/Widget/defineWidget.js';
import {
  getGuideCategory,
  getGuideTopic,
  listGuideCategories,
  listGuideTopics,
  searchGuideTopics
} from '../../services/guideService.js';
import {
  renderGuideCategoryCard,
  renderGuideTopicList,
  renderGuideTopicPage
} from './guidePageRenderer.js';

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
  introText.textContent = 'Choose a room or topic, or search for what you need.';
  intro.append(introTitle, introText);

  const searchShell = document.createElement('div');
  searchShell.className = 'guide-search';
  searchShell.dataset.guideSearch = 'true';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'house-guide-search';

  const searchLabel = document.createElement('label');
  searchLabel.className = 'guide-search-label';
  searchLabel.setAttribute('for', 'house-guide-search');
  searchLabel.textContent = 'What do you need help with?';

  const searchFieldRow = document.createElement('div');
  searchFieldRow.className = 'guide-search-field-row';

  const searchInput = document.createElement('input');
  searchInput.id = 'house-guide-search';
  searchInput.className = 'guide-search-input';
  searchInput.type = 'search';
  searchInput.placeholder = 'Try heating, Netflix, boiling water, bins…';
  searchInput.setAttribute('autocomplete', 'off');
  searchInput.setAttribute('enterkeyhint', 'search');
  searchInput.setAttribute('inputmode', 'search');

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'guide-search-clear';
  clearButton.hidden = true;
  clearButton.setAttribute('aria-label', 'Clear search');
  clearButton.textContent = 'Clear';

  searchFieldRow.append(searchInput, clearButton);
  searchWrap.append(searchLabel, searchFieldRow);

  const searchStatus = document.createElement('p');
  searchStatus.className = 'guide-search-status subtle';
  searchStatus.setAttribute('aria-live', 'polite');

  searchShell.append(searchWrap, searchStatus);

  const tileGrid = document.createElement('div');
  tileGrid.className = 'guide-category-grid';
  tileGrid.setAttribute('role', 'list');

  exploreView.append(intro, searchShell, tileGrid);

  const topicHost = document.createElement('div');
  topicHost.className = 'house-guide-topic-host';
  topicHost.hidden = true;
  topicHost.inert = true;

  root.append(exploreView, topicHost);

  /** @type {'explore' | 'category' | 'topic'} */
  let viewMode = 'explore';
  /** @type {string | null} */
  let activeCategoryId = null;

  function showExplore() {
    viewMode = 'explore';
    activeCategoryId = null;
    topicHost.hidden = true;
    topicHost.inert = true;
    topicHost.replaceChildren();
    exploreView.hidden = false;
    exploreView.inert = false;
    rebuildCategoryGrid();
    searchInput.focus();
  }

  function openCategory(categoryId) {
    const category = getGuideCategory(categoryId);
    if (!category) return;

    viewMode = 'category';
    activeCategoryId = categoryId;
    exploreView.hidden = true;
    exploreView.inert = true;
    topicHost.hidden = false;
    topicHost.inert = false;

    const { panel, backButton } = renderGuideTopicList(category, openTopic);
    backButton.addEventListener('click', showExplore);
    topicHost.replaceChildren(panel);
  }

  function openTopic(topicId) {
    const topic = getGuideTopic(topicId);
    if (!topic) return;

    const hit = listGuideTopics().find((card) => card.id === topicId);
    if (hit?.categoryId) activeCategoryId = hit.categoryId;

    viewMode = 'topic';
    exploreView.hidden = true;
    exploreView.inert = true;
    topicHost.hidden = false;
    topicHost.inert = false;

    const backTarget = hit?.categoryId ?? activeCategoryId;

    topicHost.replaceChildren(
      renderGuideTopicPage(
        topic,
        context,
        () => {
          if (backTarget) openCategory(backTarget);
          else showExplore();
        },
        openTopic
      )
    );
  }

  function rebuildCategoryGrid(query = '') {
    tileGrid.replaceChildren();
    const trimmed = query.trim();

    if (trimmed) {
      const hits = searchGuideTopics(trimmed);
      for (const hit of hits) {
        const card = renderGuideCategoryCard(
          {
            title: hit.title,
            cardSubtitle: hit.cardSubtitle,
            iconId: hit.iconId,
            accent: hit.accent,
            categoryTitle: hit.categoryTitle
          },
          () => openTopic(hit.id),
          trimmed
        );
        card.setAttribute('role', 'listitem');
        tileGrid.append(card);
      }
      return;
    }

    for (const category of listGuideCategories()) {
      const card = renderGuideCategoryCard(
        {
          title: category.title,
          cardSubtitle: category.cardSubtitle,
          iconId: category.iconId,
          accent: category.accent
        },
        () => openCategory(category.id)
      );
      card.setAttribute('role', 'listitem');
      tileGrid.append(card);
    }
  }

  function applySearch() {
    const query = searchInput.value;
    clearButton.hidden = !query.trim();
    rebuildCategoryGrid(query);

    if (!query.trim()) {
      searchStatus.textContent = '';
      return;
    }

    const topics = searchGuideTopics(query);
    if (topics.length === 0) {
      searchStatus.textContent = 'Nothing matched — try heating, Wi-Fi, or Scooter feeding.';
      return;
    }

    if (topics.length === 1) {
      searchStatus.textContent = `Showing ${topics[0].title}`;
      return;
    }

    searchStatus.textContent = `${topics.length} topics match your search.`;
  }

  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    applySearch();
    searchInput.focus();
  });

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
      if (viewMode === 'topic' && activeCategoryId) openCategory(activeCategoryId);
      else showExplore();
    }
  });

  showExplore();
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
