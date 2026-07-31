import { APPLIANCE_MANUAL_CATEGORIES } from '../../services/applianceManualsConstants.js';
import {
  getApplianceManualsState,
  refreshApplianceManuals,
  subscribeToApplianceManuals
} from '../../services/applianceManualsService.js';
import { renderApplianceManualViewer } from './applianceManualsViewer.js';

/**
 * @param {() => void} onBack
 */
export function renderApplianceManualsSitterView(onBack) {
  const panel = document.createElement('section');
  panel.className = 'appliance-manuals-sitter';
  panel.setAttribute('aria-label', 'Appliance Manuals');

  const header = document.createElement('header');
  header.className = 'guide-category-header';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'guide-back-button';
  backButton.textContent = 'Back';

  const title = document.createElement('h2');
  title.className = 'guide-category-title';
  title.textContent = 'Appliance Manuals';

  const intro = document.createElement('p');
  intro.className = 'guide-category-subtitle';
  intro.textContent = 'Instructions and user guides for appliances around the house.';

  header.append(backButton, title, intro);

  const filterRow = document.createElement('div');
  filterRow.className = 'appliance-manuals-filter-row';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'guide-search-input appliance-manuals-search';
  searchInput.placeholder = 'Search appliances or manuals…';
  searchInput.setAttribute('autocomplete', 'off');
  searchInput.setAttribute('enterkeyhint', 'search');

  const categorySelect = document.createElement('select');
  categorySelect.className = 'appliance-manuals-category-select';
  categorySelect.setAttribute('aria-label', 'Filter by category');
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All categories';
  categorySelect.append(allOption);
  for (const category of APPLIANCE_MANUAL_CATEGORIES) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  }

  filterRow.append(searchInput, categorySelect);

  const status = document.createElement('p');
  status.className = 'appliance-manuals-status subtle';
  status.setAttribute('aria-live', 'polite');

  const list = document.createElement('div');
  list.className = 'appliance-manuals-card-grid';
  list.setAttribute('role', 'list');

  const viewerHost = document.createElement('div');
  viewerHost.className = 'appliance-manuals-viewer-host';
  viewerHost.hidden = true;
  viewerHost.inert = true;

  panel.append(header, filterRow, status, list, viewerHost);

  backButton.addEventListener('click', () => {
    if (!viewerHost.hidden) {
      closeViewer();
      return;
    }
    onBack();
  });

  /** @type {(HTMLElement & { cleanup?: () => void }) | null} */
  let activeViewer = null;

  function closeViewer() {
    activeViewer?.cleanup?.();
    activeViewer = null;
    viewerHost.hidden = true;
    viewerHost.inert = true;
    viewerHost.replaceChildren();
    header.hidden = false;
    filterRow.hidden = false;
    list.hidden = false;
    status.hidden = false;
  }

  /**
   * @param {import('../../api/applianceManualsApi.js').ApplianceManual} manual
   */
  function openViewer(manual) {
    activeViewer?.cleanup?.();
    const viewer = renderApplianceManualViewer(manual, closeViewer, { allowDownload: false });
    activeViewer = viewer;
    viewerHost.replaceChildren(viewer);
    viewerHost.hidden = false;
    viewerHost.inert = false;
    header.hidden = true;
    filterRow.hidden = true;
    list.hidden = true;
    status.hidden = true;
  }

  function renderList() {
    const current = getApplianceManualsState();
    list.replaceChildren();

    if (current.status === 'loading' || current.status === 'idle') {
      status.textContent = 'Loading appliance manuals…';
      return;
    }

    if (current.status === 'unavailable') {
      status.textContent = 'Appliance manuals are temporarily unavailable.';
      return;
    }

    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const manuals = current.manuals.filter((manual) => {
      if (category && manual.category !== category) return false;
      if (!query) return true;
      const haystack = [
        manual.applianceName,
        manual.title,
        manual.category,
        manual.location,
        manual.manufacturer,
        manual.model,
        manual.description
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    if (current.manuals.length === 0) {
      status.textContent = 'No appliance manuals have been added yet.';
      return;
    }

    if (manuals.length === 0) {
      status.textContent = 'No appliance manuals match your search.';
      return;
    }

    status.textContent = `${manuals.length} manual${manuals.length === 1 ? '' : 's'}`;

    for (const manual of manuals) {
      const card = document.createElement('article');
      card.className = 'appliance-manual-card';
      card.setAttribute('role', 'listitem');

      const cardTitle = document.createElement('h3');
      cardTitle.className = 'appliance-manual-card-title';
      cardTitle.textContent = manual.applianceName;

      const manualTitle = document.createElement('p');
      manualTitle.className = 'appliance-manual-card-manual';
      manualTitle.textContent = manual.title;

      const meta = document.createElement('p');
      meta.className = 'appliance-manual-card-meta subtle';
      meta.textContent = [manual.category, manual.location].filter(Boolean).join(' · ');

      card.append(cardTitle, manualTitle, meta);

      if (manual.manufacturer || manual.model) {
        const modelLine = document.createElement('p');
        modelLine.className = 'appliance-manual-card-model subtle';
        modelLine.textContent = [manual.manufacturer, manual.model].filter(Boolean).join(' · ');
        card.append(modelLine);
      }

      if (manual.description) {
        const description = document.createElement('p');
        description.className = 'appliance-manual-card-description';
        description.textContent = manual.description;
        card.append(description);
      }

      const viewButton = document.createElement('button');
      viewButton.type = 'button';
      viewButton.className = 'button-primary appliance-manual-card-action';
      viewButton.textContent = 'View Manual';
      viewButton.addEventListener('click', () => openViewer(manual));
      card.append(viewButton);

      list.append(card);
    }
  }

  const unsubscribe = subscribeToApplianceManuals(renderList);
  searchInput.addEventListener('input', renderList);
  categorySelect.addEventListener('change', renderList);

  void refreshApplianceManuals(fetch, { owner: false, force: true });
  renderList();

  panel.cleanup = () => {
    unsubscribe();
    activeViewer?.cleanup?.();
  };

  return panel;
}
