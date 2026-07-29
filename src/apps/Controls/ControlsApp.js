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
export function mountControlsApp(viewport, context) {
  const widget = getWidgetById('alexa');
  if (!widget) {
    viewport.replaceChildren();
    return;
  }

  const page = document.createElement('div');
  page.className = 'app-page controls-app';

  const grid = document.createElement('section');
  grid.className = 'button-grid controls-grid';
  grid.setAttribute('aria-label', 'Alexa routines');
  grid.replaceChildren(...collectMountedNodes(widget.mount(context)));

  page.append(grid);
  viewport.replaceChildren(page);
}

export const controlsApp = {
  id: 'controls',
  title: 'Controls',
  icon: '🏠',
  accent: '#8b7cff',
  profiles: ['owner', 'housesitter'],
  mount: mountControlsApp
};
