import { housesitterProfile } from './housesitter.js';
import { ownerProfile } from './owner.js';

export const profiles = {
  owner: ownerProfile,
  housesitter: housesitterProfile
};

/** @type {import('../types/widget.js').ProfileId} */
export const DEFAULT_PROFILE_ID = 'owner';
