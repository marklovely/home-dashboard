import { defineWidget } from '../../components/Widget/defineWidget.js';
import { getHouseGuideMarkdown, getHouseGuidePage, loadHouseGuideCatalog } from '../../content/houseguide/index.js';
import { renderHouseGuideMarkdown } from './markdown.js';
import { highlightSearchText, searchHouseGuidePages } from './search.js';

function createGuideTile(page, onOpen) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'guide-tile routine-button';
  button.dataset.slug = page.slug;
  button.style.setProperty('--accent', page.accent);
  button.setAttribute('aria-label', page.title);

  const icon = document.createElement('span');
  icon.className = 'button-icon';
  icon.textContent = page.icon;

  const title = document.createElement('span');
  title.className = 'button-title guide-tile-title';
  title.textContent = page.shortTitle;

  const subtitle = document.createElement('span');
  subtitle.className = 'button-subtitle';
  subtitle.textContent = page.title;

  button.append(icon, title, subtitle);
  button.addEventListener('click', () => onOpen(page.slug));
  return button;
}

function createHouseGuideRoot() {
  const catalog = loadHouseGuideCatalog();
  const root = document.createElement('section');
  root.className = 'widget-panel house-guide';
  root.setAttribute('aria-label', 'House guide');

  const homeView = document.createElement('div');
  homeView.className = 'house-guide-home';

  const title = document.createElement('h2');
  title.className = 'house-guide-title';
  title.textContent = 'House Guide';

  const tileGrid = document.createElement('div');
  tileGrid.className = 'house-guide-tiles';
  tileGrid.setAttribute('role', 'list');

  const tilesBySlug = new Map();
  for (const page of catalog.pages) {
    const tile = createGuideTile(page, openArticle);
    tile.setAttribute('role', 'listitem');
    tilesBySlug.set(page.slug, tile);
    tileGrid.append(tile);
  }

  const searchWrap = document.createElement('div');
  searchWrap.className = 'house-guide-search';

  const searchLabel = document.createElement('label');
  searchLabel.className = 'guide-search-label';
  searchLabel.setAttribute('for', 'house-guide-search');
  searchLabel.textContent = 'Search the guide';

  const searchInput = document.createElement('input');
  searchInput.id = 'house-guide-search';
  searchInput.className = 'guide-search-input';
  searchInput.type = 'search';
  searchInput.placeholder = 'Search titles and guide text…';
  searchInput.setAttribute('autocomplete', 'off');
  searchInput.setAttribute('enterkeyhint', 'search');

  const searchStatus = document.createElement('p');
  searchStatus.className = 'guide-search-status subtle';
  searchStatus.setAttribute('aria-live', 'polite');

  searchWrap.append(searchLabel, searchInput, searchStatus);
  homeView.append(title, tileGrid, searchWrap);

  const articleView = document.createElement('article');
  articleView.className = 'house-guide-article';
  articleView.hidden = true;
  articleView.inert = true;

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'guide-back-button';
  backButton.textContent = '← Back to guide';

  const articleTitle = document.createElement('h2');
  articleTitle.className = 'house-guide-article-title';

  const articleBody = document.createElement('div');
  articleBody.className = 'guide-markdown';

  articleView.append(backButton, articleTitle, articleBody);
  root.append(homeView, articleView);

  let activeSlug = null;

  function applySearch() {
    const query = searchInput.value;
    const matches = searchHouseGuidePages(query, catalog.pages, catalog.markdownBySlug);
    let visibleCount = 0;

    for (const page of catalog.pages) {
      const tile = tilesBySlug.get(page.slug);
      const isMatch = matches.has(page.slug);
      tile.hidden = !isMatch;
      tile.classList.toggle('is-search-match', Boolean(query.trim()) && isMatch);
      tile.classList.toggle('is-search-hidden', Boolean(query.trim()) && !isMatch);

      const titleEl = tile.querySelector('.guide-tile-title');
      if (titleEl) {
        titleEl.innerHTML = highlightSearchText(page.shortTitle, query);
      }
      if (isMatch) visibleCount += 1;
    }

    if (query.trim()) {
      searchStatus.textContent =
        visibleCount === 0 ? 'No matching guide pages.' : `${visibleCount} matching page${visibleCount === 1 ? '' : 's'}.`;
    } else {
      searchStatus.textContent = '';
    }
  }

  function openArticle(slug) {
    const page = getHouseGuidePage(slug);
    if (!page) return;
    activeSlug = slug;
    const markdown = getHouseGuideMarkdown(slug);
    articleTitle.textContent = page.title;
    articleBody.innerHTML = renderHouseGuideMarkdown(markdown);
    homeView.hidden = true;
    articleView.hidden = false;
    articleView.inert = false;
    homeView.inert = true;
    backButton.focus();
  }

  function closeArticle() {
    activeSlug = null;
    articleView.hidden = true;
    articleView.inert = true;
    homeView.hidden = false;
    homeView.inert = false;
    searchInput.focus();
  }

  searchInput.addEventListener('input', applySearch);
  backButton.addEventListener('click', closeArticle);

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeSlug) {
      event.preventDefault();
      closeArticle();
    }
  });

  applySearch();
  return root;
}

export const houseGuideWidget = defineWidget({
  id: 'house-guide',
  layout: 'panel',
  profiles: ['owner', 'housesitter'],
  mount() {
    return createHouseGuideRoot();
  }
});
