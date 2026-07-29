import { defineApp } from '../../components/App/defineApp.js';
import { HOUSE_GUIDE_PAGES } from '../../content/houseguide/pages.js';
import { getWidgetById } from '../../services/widgetRegistry.js';

/**
 * @param {Node} mounted
 * @returns {Node[]}
 */
function collectMountedNodes(mounted) {
  if (mounted instanceof DocumentFragment) {
    return [...mounted.children];
  }
  return [mounted];
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
export function mountHouseGuideApp(viewport, context) {
  const widget = getWidgetById('house-guide');
  if (!widget) {
    viewport.replaceChildren();
    return;
  }

  const page = document.createElement('div');
  page.className = 'app-page house-guide-app';
  page.append(...collectMountedNodes(widget.mount(context)));
  viewport.replaceChildren(page);
}

function houseGuideSummary() {
  const count = HOUSE_GUIDE_PAGES.length;
  return {
    title: `${count} guides available`,
    subtitle: 'Markdown house guide'
  };
}

export const houseGuideApp = defineApp({
  id: 'house-guide',
  title: 'House Guide',
  iconId: 'book-open',
  description: 'Read the house guide and search topics',
  capabilities: ['search', 'offline', 'markdown'],
  accent: '#f4b64f',
  profiles: ['owner', 'housesitter'],
  summary: houseGuideSummary,
  mount: mountHouseGuideApp
});
