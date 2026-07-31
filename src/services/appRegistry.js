const APP_DISPLAY_ORDER = [
  'controls',
  'house-guide',
  'scooter',
  'weather',
  'bins',
  'emergency',
  'plex',
  'my-day',
  'appliance-manuals',
  'settings'
];

/** @type {Map<string, import('../types/app.js').App>} */
const apps = new Map();

/** @param {import('../types/app.js').App} app */
export function registerApp(app) {
  if (apps.has(app.id)) {
    throw new Error(`App "${app.id}" is already registered.`);
  }
  apps.set(app.id, app);
}

/** @param {string} appId */
export function getAppById(appId) {
  return apps.get(appId);
}

/** @param {import('../types/app.js').ProfileId} profileId */
export function getAppsForProfile(profileId) {
  return [...apps.values()]
    .filter((app) => app.profiles.includes(profileId))
    .sort((left, right) => {
      const leftOrder = APP_DISPLAY_ORDER.indexOf(left.id);
      const rightOrder = APP_DISPLAY_ORDER.indexOf(right.id);
      return (leftOrder === -1 ? 999 : leftOrder) - (rightOrder === -1 ? 999 : rightOrder);
    });
}
