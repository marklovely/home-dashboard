import { getSiteProfileState } from '../services/siteProfileService.js';

/**
 * Pet name for the pet care app label (falls back when profile has no pet name).
 * @param {string} [fallback='Pet care']
 */
export function getPetDisplayName(fallback = 'Pet care') {
  const petCare = getSiteProfileState()?.profile?.petCare;
  if (petCare && typeof petCare === 'object' && petCare.hasPets) {
    const name = String(petCare.name ?? '').trim();
    if (name) return name;
  }
  return fallback;
}
