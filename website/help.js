import { PUBLIC_HELP_CATALOG } from './help-data.js';

const AUDIENCES = {
  owner: { id: 'owner', label: 'Using the hub', sections: PUBLIC_HELP_CATALOG.owner },
  guest: { id: 'guest', label: 'Staying as a guest', sections: PUBLIC_HELP_CATALOG.sitter }
};

const nav = document.querySelector('#help-nav');
const article = document.querySelector('#help-article');
const searchInput = document.querySelector('#help-search');
const tabButtons = [...document.querySelectorAll('[data-audience]')];

if (!nav || !article || !searchInput || tabButtons.length === 0) {
  /* Help page chrome missing. */
} else {
  let audienceId = 'owner';
  let sectionId = AUDIENCES.owner.sections[0]?.id ?? '';
  let query = '';

  function parseHash() {
    const raw = window.location.hash.replace(/^#/, '');
    const [audience, section] = raw.split('/');
    if (audience === 'owner' || audience === 'guest') {
      audienceId = audience;
    }
    if (section) sectionId = section;
  }

  function writeHash() {
    const next = `#${audienceId}/${sectionId}`;
    if (window.location.hash !== next) {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
    }
  }

  function matchingSections() {
    const sections = AUDIENCES[audienceId].sections;
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return sections;
    return sections.filter((section) => {
      if (section.title.toLowerCase().includes(trimmed)) return true;
      if (section.keywords.some((word) => word.toLowerCase().includes(trimmed))) return true;
      return section.blocks.some((block) => {
        if (block.type === 'p' || block.type === 'h4') return block.text.toLowerCase().includes(trimmed);
        if (block.type === 'ul' || block.type === 'ol') return block.items.some((item) => item.toLowerCase().includes(trimmed));
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

  function renderBlock(block) {
    if (block.type === 'h4') {
      const heading = document.createElement('h3');
      heading.className = 'help-subheading';
      heading.textContent = block.text;
      return heading;
    }
    if (block.type === 'ul' || block.type === 'ol') {
      const list = document.createElement(block.type);
      for (const item of block.items) {
        const li = document.createElement('li');
        li.textContent = item;
        list.append(li);
      }
      return list;
    }
    if (block.type === 'table') {
      const wrap = document.createElement('div');
      wrap.className = 'help-table-wrap';
      const table = document.createElement('table');
      table.className = 'help-table';
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
    paragraph.textContent = block.text;
    return paragraph;
  }

  function paint() {
    const sections = matchingSections();
    const active = sections.find((section) => section.id === sectionId) ?? sections[0];
    sectionId = active?.id ?? '';

    for (const button of tabButtons) {
      const selected = button.dataset.audience === audienceId;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    }

    nav.replaceChildren();
    if (sections.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'help-empty';
      empty.textContent = 'No matching topics. Try another search.';
      nav.append(empty);
      article.replaceChildren();
      const heading = document.createElement('h2');
      heading.textContent = 'No matching topics';
      article.append(heading);
      return;
    }

    for (const section of sections) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'help-nav-button';
      button.classList.toggle('is-active', section.id === sectionId);
      button.textContent = section.title;
      button.addEventListener('click', () => {
        sectionId = section.id;
        writeHash();
        paint();
        article.focus();
      });
      nav.append(button);
    }

    article.replaceChildren();
    article.tabIndex = -1;
    const heading = document.createElement('h2');
    heading.textContent = active.title;
    article.append(heading);
    for (const block of active.blocks) {
      article.append(renderBlock(block));
    }
  }

  for (const button of tabButtons) {
    button.addEventListener('click', () => {
      audienceId = button.dataset.audience === 'guest' ? 'guest' : 'owner';
      sectionId = AUDIENCES[audienceId].sections[0]?.id ?? '';
      writeHash();
      paint();
    });
  }

  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    paint();
  });

  window.addEventListener('hashchange', () => {
    parseHash();
    paint();
  });

  parseHash();
  if (!window.location.hash) writeHash();
  paint();
}
