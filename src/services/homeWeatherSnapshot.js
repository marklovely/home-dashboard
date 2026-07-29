/** @type {import('../types/app.js').AppSummary} */
let snapshot = {
  title: '—',
  subtitle: 'Locating…'
};

/** @type {Set<() => void>} */
const listeners = new Set();

/** @param {() => void} listener */
export function subscribeWeatherSnapshot(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @param {import('../types/app.js').AppSummary} next */
export function setWeatherSnapshot(next) {
  snapshot = next;
  for (const listener of listeners) {
    listener();
  }
}

/** @returns {import('../types/app.js').AppSummary} */
export function getWeatherSnapshot() {
  return snapshot;
}
