/**
 * @param {import('../../types/widget.js').Widget} widget
 * @returns {import('../../types/widget.js').Widget['layout']}
 */
function getWidgetLayout(widget) {
  return widget.layout ?? 'controls';
}

/**
 * @param {import('../../types/widget.js').Widget} widget
 * @returns {Node[]}
 */
function mountWidgetNodes(widget, context) {
  const mounted = widget.mount(context);
  if (mounted instanceof DocumentFragment) {
    return [...mounted.children];
  }
  return [mounted];
}

/**
 * @param {HTMLElement} controlsContainer
 * @param {HTMLElement} panelContainer
 * @param {import('../../types/widget.js').Widget[]} widgets
 * @param {import('../../types/widget.js').WidgetContext} context
 */
export function mountDashboardWidgets(controlsContainer, panelContainer, widgets, context) {
  const controlNodes = [];
  const panelNodes = [];

  for (const widget of widgets) {
    const nodes = mountWidgetNodes(widget, context);
    if (getWidgetLayout(widget) === 'panel') {
      panelNodes.push(...nodes);
    } else {
      controlNodes.push(...nodes);
    }
  }

  controlsContainer.replaceChildren(...controlNodes);
  panelContainer.replaceChildren(...panelNodes);
}

/**
 * @deprecated Use mountDashboardWidgets with separate control and panel containers.
 */
export function mountWidgetGrid(container, widgets, context) {
  mountDashboardWidgets(container, container, widgets, context);
}
