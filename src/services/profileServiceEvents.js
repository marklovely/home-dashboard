/** @type {Set<(profileId: import('../types/app.js').ProfileId) => void>} */
const listeners = new Set();

/** @param {(profileId: import('../types/app.js').ProfileId) => void} listener */
export function subscribeToProfileChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @param {import('../types/app.js').ProfileId} profileId */
export function notifyProfileChange(profileId) {
  for (const listener of listeners) {
    listener(profileId);
  }
}
