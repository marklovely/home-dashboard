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
  return [...widgets.values()].filter((widget) => widget.profiles.includes(profileId));
}
