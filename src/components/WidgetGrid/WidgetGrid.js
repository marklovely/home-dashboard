/**
 * @param {HTMLElement} container
 * @param {import('../../types/widget.js').Widget[]} widgets
 * @param {import('../../types/widget.js').WidgetContext} context
 */
export function mountWidgetGrid(container, widgets, context) {
  const nodes = widgets.flatMap((widget) => {
    const mounted = widget.mount(context);
    if (mounted instanceof DocumentFragment) {
      return [...mounted.children];
    }
    return [mounted];
  });
  container.replaceChildren(...nodes);
}
