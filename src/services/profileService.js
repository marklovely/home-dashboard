import { DEFAULT_PROFILE_ID } from '../profiles/index.js';

/** @type {import('../types/widget.js').ProfileId} */
let activeProfileId = DEFAULT_PROFILE_ID;

/** @returns {import('../types/widget.js').ProfileId} */
export function getActiveProfileId() {
  return activeProfileId;
}

/** @param {import('../types/widget.js').ProfileId} profileId */
export function setActiveProfileId(profileId) {
  activeProfileId = profileId;
}
