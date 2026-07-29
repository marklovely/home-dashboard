const WIDGET_DISPLAY_ORDER = ['alexa', 'house-guide'];

/** @type {Map<string, import('../types/widget.js').Widget>} */
const widgets = new Map();

/** @param {import('../types/widget.js').Widget} widget */
export function registerWidget(widget) {
  if (widgets.has(widget.id)) {
    throw new Error(`Widget "${widget.id}" is already registered.`);
  }
  widgets.set(widget.id, widget);
}

/** @param {import('../types/widget.js').ProfileId} profileId */
export function getWidgetsForProfile(profileId) {
  return [...widgets.values()]
    .filter((widget) => widget.profiles.includes(profileId))
    .sort((left, right) => {
      const leftOrder = WIDGET_DISPLAY_ORDER.indexOf(left.id);
      const rightOrder = WIDGET_DISPLAY_ORDER.indexOf(right.id);
      return (leftOrder === -1 ? 999 : leftOrder) - (rightOrder === -1 ? 999 : rightOrder);
    });
}

/** @param {string} widgetId */
export function getWidgetById(widgetId) {
  return widgets.get(widgetId);
}
