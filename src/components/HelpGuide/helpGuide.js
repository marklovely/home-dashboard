/** @typedef {{ type: 'p', text: string } | { type: 'h4', text: string } | { type: 'ul', items: string[] } | { type: 'ol', items: string[] } | { type: 'qa', question: string, answer: string } | { type: 'table', headers: string[], rows: string[][] }} HelpGuideBlock */

/** @typedef {{ id: string, title: string, keywords: string[], blocks: HelpGuideBlock[] }} HelpGuideSection */

/**
 * @param {HelpGuideSection[]} sections
 * @param {string} [sectionId]
 * @returns {HelpGuideSection | undefined}
 */
export function getHelpGuideSection(sections, sectionId) {
  if (!sectionId) return sections[0];
  return sections.find((section) => section.id === sectionId);
}

/**
 * @param {HelpGuideSection[]} sections
 * @param {string} query
 */
export function searchHelpGuideSections(sections, query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return sections;
  return sections.filter((section) => {
    if (section.title.toLowerCase().includes(trimmed)) return true;
    if (section.keywords.some((word) => word.includes(trimmed))) return true;
    return section.blocks.some((block) => {
      if (block.type === 'p' || block.type === 'h4') return block.text.toLowerCase().includes(trimmed);
      if (block.type === 'ul' || block.type === 'ol') return block.items.some((item) => item.toLowerCase().includes(trimmed));
      if (block.type === 'qa') {
        return block.question.toLowerCase().includes(trimmed) || block.answer.toLowerCase().includes(trimmed);
      }
      if (block.type === 'table') {
        return (
          block.headers.some((cell) => cell.toLowerCase().includes(trimmed)) ||
          block.rows.some((row) => row.some((cell) => cell.toLowerCase().includes(trimmed)))
        );
      }
      return false;
    });
  });
}

/**
 * @param {HelpGuideBlock} block
 */
function renderHelpBlock(block) {
  if (block.type === 'h4') {
    const heading = document.createElement('h4');
    heading.className = 'help-guide-subheading';
    heading.textContent = block.text;
    return heading;
  }

  if (block.type === 'ul' || block.type === 'ol') {
    const list = document.createElement(block.type);
    list.className = 'help-guide-list';
    for (const item of block.items) {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    }
    return list;
  }

  if (block.type === 'qa') {
    const wrap = document.createElement('div');
    wrap.className = 'help-guide-qa';
    const heading = document.createElement('h4');
    heading.className = 'help-guide-subheading';
    heading.textContent = block.question;
    const paragraph = document.createElement('p');
    paragraph.className = 'help-guide-paragraph';
    paragraph.textContent = block.answer;
    wrap.append(heading, paragraph);
    return wrap;
  }

  if (block.type === 'table') {
    const wrap = document.createElement('div');
    wrap.className = 'help-guide-table-wrap';
    const table = document.createElement('table');
    table.className = 'help-guide-table';
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
  paragraph.className = 'help-guide-paragraph';
  paragraph.textContent = block.text;
  return paragraph;
}

/**
 * @param {HelpGuideSection} section
 */
function renderHelpSectionBody(section) {
  const body = document.createElement('div');
  body.className = 'help-guide-section-body';
  for (const block of section.blocks) {
    body.append(renderHelpBlock(block));
  }
  return body;
}

/**
 * @param {Object} options
 * @param {string} options.title
 * @param {HelpGuideSection[]} options.sections
 * @param {string} [options.initialSectionId]
 * @param {string} [options.searchPlaceholder]
 * @param {string} [options.dialogId]
 */
export function openHelpGuide({
  title,
  sections,
  initialSectionId,
  searchPlaceholder = 'Search help…',
  dialogId = 'help-guide-title'
}) {
  const initialSection = getHelpGuideSection(sections, initialSectionId) ?? sections[0];
  let activeSectionId = initialSection.id;

  const overlay = document.createElement('div');
  overlay.className = 'help-guide-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', dialogId);

  const panel = document.createElement('div');
  panel.className = 'help-guide-panel';

  const header = document.createElement('header');
  header.className = 'help-guide-header';

  const heading = document.createElement('h2');
  heading.id = dialogId;
  heading.className = 'help-guide-title';
  heading.textContent = title;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'button-secondary help-guide-close';
  closeButton.textContent = 'Close';

  header.append(heading, closeButton);

  const searchRow = document.createElement('div');
  searchRow.className = 'help-guide-search-row';

  const searchLabel = document.createElement('label');
  searchLabel.className = 'help-guide-search-label';
  searchLabel.setAttribute('for', `${dialogId}-search`);
  searchLabel.textContent = 'Search help';

  const searchInput = document.createElement('input');
  searchInput.id = `${dialogId}-search`;
  searchInput.type = 'search';
  searchInput.className = 'help-guide-search';
  searchInput.placeholder = searchPlaceholder;
  searchInput.setAttribute('autocomplete', 'off');

  searchRow.append(searchLabel, searchInput);

  const layout = document.createElement('div');
  layout.className = 'help-guide-layout';

  const nav = document.createElement('nav');
  nav.className = 'help-guide-nav';
  nav.setAttribute('aria-label', 'Help topics');

  const content = document.createElement('div');
  content.className = 'help-guide-content';

  const contentTitle = document.createElement('h3');
  contentTitle.className = 'help-guide-content-title';

  const contentBodyHost = document.createElement('div');
  contentBodyHost.className = 'help-guide-content-body';

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

  function renderNav(filteredSections) {
    nav.replaceChildren();
    navButtons.clear();
    for (const section of filteredSections) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'help-guide-nav-button';
      button.textContent = section.title;
      button.addEventListener('click', () => {
        searchInput.value = '';
        renderNav(sections);
        renderSection(section);
      });
      navButtons.set(section.id, button);
      nav.append(button);
    }
    const next =
      filteredSections.find((section) => section.id === activeSectionId) ??
      filteredSections[0] ??
      initialSection;
    if (next) renderSection(next);
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
    renderNav(searchHelpGuideSections(sections, searchInput.value));
  });

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', onKeyDown);

  renderNav(sections);
  searchInput.focus();
}

/**
 * @param {Object} options
 * @param {string} options.label
 * @param {string} options.title
 * @param {HelpGuideSection[]} options.sections
 * @param {string} [options.initialSectionId]
 * @param {string} [options.searchPlaceholder]
 * @param {string} [options.buttonClassName]
 * @param {string} [options.dialogId]
 */
export function createHelpGuideButton({
  label,
  title,
  sections,
  initialSectionId,
  searchPlaceholder,
  buttonClassName = 'button-secondary help-guide-trigger',
  dialogId
}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = buttonClassName;
  button.textContent = label;
  button.addEventListener('click', () => {
    openHelpGuide({ title, sections, initialSectionId, searchPlaceholder, dialogId });
  });
  return button;
}

/**
 * @param {Object} options
 * @param {string} options.title
 * @param {HelpGuideSection[]} options.sections
 * @param {string} sectionId
 * @param {string} [label]
 */
export function createHelpGuideLink({ title, sections, sectionId, label = 'Help' }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'help-guide-inline-link';
  button.textContent = label;
  button.addEventListener('click', () => {
    openHelpGuide({ title, sections, initialSectionId: sectionId, dialogId: `${title}-help-title` });
  });
  return button;
}
