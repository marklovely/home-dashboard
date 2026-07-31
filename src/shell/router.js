export const HOME_ROUTE = 'home';

/** @type {string} */
let currentRoute = HOME_ROUTE;

/** @type {string | null} */
let currentGuideTopicId = null;

/** @type {Set<(route: string) => void>} */
const listeners = new Set();

/**
 * @param {string} route
 * @param {string | null | undefined} guideTopicId
 */
function buildHash(route, guideTopicId) {
  if (route === HOME_ROUTE && !guideTopicId) return '';
  let hash = `#/${route}`;
  if (guideTopicId) {
    hash += `/topic/${encodeURIComponent(guideTopicId)}`;
  }
  return hash;
}

function parseLocation() {
  const match = window.location.hash.match(/^#\/([^/?#]+)(?:\/(.*))?$/);
  const route = match?.[1] ?? HOME_ROUTE;
  const rest = match?.[2] ?? '';
  const topicMatch = rest.match(/^topic\/([^/?#]+)/);
  const guideTopicId = topicMatch?.[1] ? decodeURIComponent(topicMatch[1]) : null;
  return { route, guideTopicId };
}

function notify() {
  for (const listener of listeners) {
    listener(currentRoute);
  }
}

/** @returns {string} */
export function getCurrentRoute() {
  return currentRoute;
}

/** @returns {string | null} */
export function getGuideTopicFromRoute() {
  return currentGuideTopicId;
}

/**
 * @param {string} route
 * @param {{ guideTopicId?: string | null }} [options]
 */
export function navigate(route, options = {}) {
  const nextRoute = route || HOME_ROUTE;
  const nextGuideTopicId = options.guideTopicId !== undefined ? options.guideTopicId : null;
  if (nextRoute === currentRoute && nextGuideTopicId === currentGuideTopicId) return;

  currentRoute = nextRoute;
  currentGuideTopicId = nextGuideTopicId;
  const url = `${window.location.pathname}${window.location.search}${buildHash(nextRoute, nextGuideTopicId)}`;
  window.history.pushState({ route: nextRoute, guideTopicId: nextGuideTopicId }, '', url);
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
    const parsed = parseLocation();
    if (parsed.route !== HOME_ROUTE && !getAppById(parsed.route)) {
      currentRoute = HOME_ROUTE;
      currentGuideTopicId = null;
      window.history.replaceState({ route: HOME_ROUTE, guideTopicId: null }, '', window.location.pathname);
    } else {
      currentRoute = parsed.route;
      currentGuideTopicId = parsed.guideTopicId;
    }
    notify();
  };

  window.addEventListener('hashchange', applyLocation);
  window.addEventListener('popstate', applyLocation);
  applyLocation();
}

/** @internal */
export function resetRouterForTests() {
  currentRoute = HOME_ROUTE;
  currentGuideTopicId = null;
  listeners.clear();
}
