import {
  GUIDE_EDITOR_HELP_SECTIONS,
  getGuideEditorHelpSection,
  searchGuideEditorHelpSections
} from './guideEditorHelpContent.js';

/**
 * @param {import('./guideEditorHelpContent.js').GuideEditorHelpBlock} block
 */
function renderHelpBlock(block) {
  if (block.type === 'h4') {
    const heading = document.createElement('h4');
    heading.className = 'guide-editor-help-subheading';
    heading.textContent = block.text;
    return heading;
  }

  if (block.type === 'ul') {
    const list = document.createElement('ul');
    list.className = 'guide-editor-help-list';
    for (const item of block.items) {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    }
    return list;
  }

  if (block.type === 'table') {
    const wrap = document.createElement('div');
    wrap.className = 'guide-editor-help-table-wrap';
    const table = document.createElement('table');
    table.className = 'guide-editor-help-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const header of block.headers) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = header;
      headRow.append(th);
    }
    thead.append(headRow);
    const tbody = document.createElement('tbody');
    for (const row of block.rows) {
      const tr = document.createElement('tr');
      for (const cell of row) {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(thead, tbody);
    wrap.append(table);
    return wrap;
  }

  const paragraph = document.createElement('p');
  paragraph.className = 'guide-editor-help-paragraph';
  paragraph.textContent = block.text;
  return paragraph;
}

/**
 * @param {import('./guideEditorHelpContent.js').GuideEditorHelpSection} section
 */
function renderHelpSectionBody(section) {
  const body = document.createElement('div');
  body.className = 'guide-editor-help-section-body';
  for (const block of section.blocks) {
    body.append(renderHelpBlock(block));
  }
  return body;
}

/**
 * @param {Object} [options]
 * @param {string} [options.initialSectionId]
 */
export function openGuideEditorHelp(options = {}) {
  const initialSection = getGuideEditorHelpSection(options.initialSectionId) ?? GUIDE_EDITOR_HELP_SECTIONS[0];
  let activeSectionId = initialSection.id;

  const overlay = document.createElement('div');
  overlay.className = 'guide-editor-help-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'guide-editor-help-title');

  const panel = document.createElement('div');
  panel.className = 'guide-editor-help-panel';

  const header = document.createElement('header');
  header.className = 'guide-editor-help-header';

  const title = document.createElement('h2');
  title.id = 'guide-editor-help-title';
  title.className = 'guide-editor-help-title';
  title.textContent = 'Writing guide';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'button-secondary guide-editor-help-close';
  closeButton.textContent = 'Close';

  header.append(title, closeButton);

  const searchRow = document.createElement('div');
  searchRow.className = 'guide-editor-help-search-row';

  const searchLabel = document.createElement('label');
  searchLabel.className = 'guide-editor-help-search-label';
  searchLabel.setAttribute('for', 'guide-editor-help-search');
  searchLabel.textContent = 'Search help';

  const searchInput = document.createElement('input');
  searchInput.id = 'guide-editor-help-search';
  searchInput.type = 'search';
  searchInput.className = 'guide-editor-help-search';
  searchInput.placeholder = 'Publish, photos, quick actions…';
  searchInput.setAttribute('autocomplete', 'off');

  searchRow.append(searchLabel, searchInput);

  const layout = document.createElement('div');
  layout.className = 'guide-editor-help-layout';

  const nav = document.createElement('nav');
  nav.className = 'guide-editor-help-nav';
  nav.setAttribute('aria-label', 'Help topics');

  const content = document.createElement('div');
  content.className = 'guide-editor-help-content';

  const contentTitle = document.createElement('h3');
  contentTitle.className = 'guide-editor-help-content-title';

  const contentBodyHost = document.createElement('div');
  contentBodyHost.className = 'guide-editor-help-content-body';

  content.append(contentTitle, contentBodyHost);
  layout.append(nav, content);
  panel.append(header, searchRow, layout);
  overlay.append(panel);
  document.body.append(overlay);

  /** @type {Map<string, HTMLButtonElement>} */
  const navButtons = new Map();

  function renderSection(section) {
    activeSectionId = section.id;
    contentTitle.textContent = section.title;
    contentBodyHost.replaceChildren(renderHelpSectionBody(section));
    for (const [id, button] of navButtons) {
      const active = id === section.id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'true' : 'false');
    }
  }

  function renderNav(sections) {
    nav.replaceChildren();
    navButtons.clear();
    for (const section of sections) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guide-editor-help-nav-button';
      button.textContent = section.title;
      button.addEventListener('click', () => {
        searchInput.value = '';
        renderNav(GUIDE_EDITOR_HELP_SECTIONS);
        renderSection(section);
      });
      navButtons.set(section.id, button);
      nav.append(button);
    }
    const next =
      sections.find((section) => section.id === activeSectionId) ??
      sections[0] ??
      initialSection;
    renderSection(next);
  }

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  searchInput.addEventListener('input', () => {
    renderNav(searchGuideEditorHelpSections(searchInput.value));
  });

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', onKeyDown);

  renderNav(GUIDE_EDITOR_HELP_SECTIONS);
  searchInput.focus();
}

/**
 * @param {() => void} [onOpen]
 */
export function createGuideEditorHelpButton(onOpen) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button-secondary guide-editor-help-trigger';
  button.textContent = 'Writing guide';
  button.addEventListener('click', () => {
    onOpen?.();
    openGuideEditorHelp();
  });
  return button;
}

/**
 * @param {string} title
 * @param {string} sectionId
 */
export function createGuideEditorSectionHeading(title, sectionId) {
  const row = document.createElement('div');
  row.className = 'guide-editor-section-heading-row';

  const heading = document.createElement('h4');
  heading.className = 'house-guide-editor-blocks-title';
  heading.textContent = title;

  row.append(heading, createGuideEditorContextHelpLink(sectionId));
  return row;
}

/**
 * @param {string} sectionId
 * @param {string} [label]
 */
export function createGuideEditorContextHelpLink(sectionId, label = 'Help') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'guide-editor-inline-help';
  button.textContent = label;
  button.addEventListener('click', () => {
    openGuideEditorHelp({ initialSectionId: sectionId });
  });
  return button;
}
