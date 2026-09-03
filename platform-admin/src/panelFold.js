/** @type {Record<string, boolean>} */
const openFolds = Object.create(null);

/**
 * @param {string} id
 */
export function panelFoldOpenAttr(id) {
  return openFolds[id] ? ' open' : '';
}

/**
 * Remember whether an operator left a dashboard panel open across re-renders.
 *
 * @param {string} id
 */
export function wirePanelFold(id) {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLDetailsElement)) return;
  el.addEventListener('toggle', () => {
    openFolds[id] = el.open;
  });
}

/** Clear remembered fold state between tests. */
export function resetPanelFoldState() {
  for (const key of Object.keys(openFolds)) {
    delete openFolds[key];
  }
}
