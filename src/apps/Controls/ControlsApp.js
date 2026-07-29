import { defineApp } from '../../components/App/defineApp.js';
import { isHouseSitterMode, getModeConfig } from '../../modes/modeConfig.js';
import { getWidgetById } from '../../services/widgetRegistry.js';
import { mountSitterControlsGrid } from '../../widgets/Controls/sitterControlsGrid.js';

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
  const page = document.createElement('div');
  page.className = 'app-page controls-app';

  if (isHouseSitterMode()) {
    page.append(...collectMountedNodes(mountSitterControlsGrid(context)));
    viewport.replaceChildren(page);
    return;
  }

  const widget = getWidgetById('alexa');
  if (!widget) {
    viewport.replaceChildren();
    return;
  }

  const grid = document.createElement('section');
  grid.className = 'button-grid controls-grid';
  grid.setAttribute('aria-label', 'Alexa routines');
  grid.replaceChildren(...collectMountedNodes(widget.mount(context)));

  page.append(grid);
  viewport.replaceChildren(page);
}

/**
 * @param {import('../../types/app.js').ShellContext} context
 */
function controlsSummary(context) {
  if (isHouseSitterMode()) {
    const count = getModeConfig().controls?.allowedButtonIds.length ?? 0;
    return {
      title: `${count} home controls`,
      subtitle: 'Lights and bedtime'
    };
  }
  const count = context.config.buttons?.length ?? 0;
  return {
    title: `${count} routine${count === 1 ? '' : 's'} available`,
    subtitle: 'Virtual Buttons ready'
  };
}

export const controlsApp = defineApp({
  id: 'controls',
  title: 'Controls',
  iconId: 'lightbulb',
  description: 'Control lighting, heating, and scenes',
  capabilities: ['lighting', 'heating', 'scenes'],
  accent: '#8b7cff',
  profiles: ['owner', 'housesitter'],
  summary: controlsSummary,
  mount: mountControlsApp
});
