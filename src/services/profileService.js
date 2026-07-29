import { DEFAULT_PROFILE_ID } from '../profiles/index.js';
import { notifyProfileChange } from './profileServiceEvents.js';

/** @type {import('../types/widget.js').ProfileId} */
let activeProfileId = DEFAULT_PROFILE_ID;

/** @returns {import('../types/widget.js').ProfileId} */
export function getActiveProfileId() {
  return activeProfileId;
}

/** @param {import('../types/widget.js').ProfileId} profileId */
export function setActiveProfileId(profileId) {
  if (activeProfileId === profileId) return;
  activeProfileId = profileId;
  notifyProfileChange(profileId);
}

export { subscribeToProfileChange } from './profileServiceEvents.js';
