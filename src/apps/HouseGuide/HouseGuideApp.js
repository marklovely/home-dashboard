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

export const houseGuideApp = {
  id: 'house-guide',
  title: 'House Guide',
  icon: '📖',
  accent: '#f4b64f',
  profiles: ['owner', 'housesitter'],
  mount: mountHouseGuideApp
};
