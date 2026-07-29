export const HOME_ROUTE = 'home';

/** @type {string} */
let currentRoute = HOME_ROUTE;

/** @type {Set<(route: string) => void>} */
const listeners = new Set();

/** @returns {string} */
export function getCurrentRoute() {
  return currentRoute;
}

function parseRouteFromLocation() {
  const match = window.location.hash.match(/^#\/([^/?#]+)/);
  return match?.[1] ?? HOME_ROUTE;
}

function notify() {
  for (const listener of listeners) {
    listener(currentRoute);
  }
}

/** @param {string} route */
export function navigate(route) {
  const nextRoute = route || HOME_ROUTE;
  if (nextRoute === currentRoute) return;

  currentRoute = nextRoute;
  const hash = nextRoute === HOME_ROUTE ? '' : `#/${nextRoute}`;
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.pushState({ route: nextRoute }, '', url);
  notify();
}

/** @param {(route: string) => void} listener */
export function subscribeToRoute(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @param {import('../services/appRegistry.js').getAppById} getAppById */
export function initRouter(getAppById) {
  const applyLocation = () => {
    const parsed = parseRouteFromLocation();
    if (parsed !== HOME_ROUTE && !getAppById(parsed)) {
      currentRoute = HOME_ROUTE;
      window.history.replaceState({ route: HOME_ROUTE }, '', window.location.pathname);
    } else {
      currentRoute = parsed;
    }
    notify();
  };

  window.addEventListener('hashchange', applyLocation);
  window.addEventListener('popstate', applyLocation);
  applyLocation();
}
