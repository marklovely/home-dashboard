import { isDemoHubEnvironment } from '../auth/hubEnvironment.js';
import { getAppDisplayTitle } from '../modes/modeConfig.js';
import { isAppEnabledForEnvironment } from '../services/environmentAppPolicy.js';
import { isAppVisible } from '../services/appVisibility.js';
import { getAppById } from '../services/appRegistry.js';
import { getSiteProfileState } from '../services/siteProfileService.js';

/**
 * Host name(s) for sitter-facing copy (primary contact, then hub name).
 * @param {string} [fallback='your hosts']
 */
export function getHostDisplayName(fallback = 'your hosts') {
  const profile = getSiteProfileState()?.profile;
  const primary = String(profile?.primaryContact?.name ?? '').trim();
  if (primary) return primary;
  const hubName = String(profile?.hubName ?? '').trim();
  if (hubName) return hubName;
  return fallback;
}

/** @returns {string} */
export function getStayPlaceLabel() {
  const hubName = String(getSiteProfileState()?.profile?.hubName ?? '').trim();
  if (hubName) return hubName;
  const hosts = getHostDisplayName('');
  if (hosts) return `${hosts}'s home`;
  return 'this home';
}

/** @returns {boolean} */
export function isPetCareVisibleInHelp() {
  const petCare = getSiteProfileState()?.profile?.petCare;
  if (!petCare?.hasPets) return false;
  const app = getAppById('scooter');
  return Boolean(app && isAppEnabledForEnvironment(app));
}

/** @returns {boolean} */
export function isControlsVisibleInHelp() {
  return isAppVisible('controls');
}

/** @returns {string} */
export function getPetCareAppTitle() {
  const app = getAppById('scooter');
  return getAppDisplayTitle(app ?? { id: 'scooter', title: 'Pet care' });
}

/** @returns {string} */
export function getPetSpeciesSummary() {
  const petCare = getSiteProfileState()?.profile?.petCare;
  if (!petCare?.hasPets) return '';
  const species = String(petCare.species ?? '').trim();
  const age = String(petCare.age ?? '').trim();
  if (species && age) return `${species}, ${age}`;
  return species || age || 'your pet';
}

/** @returns {string} */
export function buildSitterHelpSearchPlaceholder() {
  const hints = ['House Guide'];
  if (isPetCareVisibleInHelp()) hints.push(getPetCareAppTitle());
  hints.push('Emergency');
  return `${hints.join(', ')}…`;
}

export function isDemoHubHelpContext() {
  return isDemoHubEnvironment();
}
