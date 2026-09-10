import { primaryPet } from './petCare.js';
import { getSiteProfileState } from '../services/siteProfileService.js';

/**
 * Pet name for the pet care app label (falls back when profile has no pet name).
 * @param {string} [fallback='Pet care']
 */
export function getPetDisplayName(fallback = 'Pet care') {
  const pet = primaryPet(getSiteProfileState()?.profile?.petCare);
  if (pet?.name.trim()) return pet.name.trim();
  return fallback;
}
