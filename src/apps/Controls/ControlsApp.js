import { isTestHubEnvironment } from '../../auth/hubEnvironment.js';
import { isControlsConfigured } from '../../services/environmentAppPolicy.js';
import { defineApp } from '../../components/App/defineApp.js';
import { isHouseSitterMode } from '../../modes/modeConfig.js';
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

  if (!isControlsConfigured(context.config)) {
    const panel = document.createElement('section');
    panel.className = 'controls-unconfigured';
    panel.setAttribute('aria-label', 'Controls not configured');

    const title = document.createElement('h2');
    title.textContent = 'Home controls not set up';

    const copy = document.createElement('p');
    copy.className = 'subtle';
    copy.textContent = isTestHubEnvironment()
      ? 'This test hub starts without Alexa Virtual Button routines. Configure buttons in src/config.js on your production build when you are ready.'
      : 'No Virtual Button routines are configured yet. Add them in src/config.js to enable lighting and scene controls.';

    panel.append(title, copy);
    page.append(panel);
    viewport.replaceChildren(page);
    return;
  }

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
  grid.className = 'controls-grid controls-grid--grouped';
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
    const count = context.config.buttons?.length ?? 0;
    return {
      title: `${count} home control${count === 1 ? '' : 's'}`,
      subtitle: 'Lighting, heating, and scenes'
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
