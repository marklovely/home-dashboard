import starterGuideOwner from './starter-guide-owner.json';
import starterGuideHousesitter from './starter-guide-housesitter.json';
import starterGuideAirbnb from './starter-guide-airbnb.json';
import starterGuideBoth from './starter-guide-both.json';

/** @typedef {'owner' | 'housesitter' | 'airbnb' | 'both'} HubUseCase */

/** @type {Record<HubUseCase, { catalog: typeof starterGuideOwner, label: string, summary: string, hint: string }>} */
export const STARTER_GUIDE_BY_USE_CASE = {
  owner: {
    catalog: starterGuideOwner,
    label: 'Personal home guide',
    summary: 'Wi-Fi, contacts, home notes, safety reference, appliance manuals',
    hint: 'Light owner reference plus an appliance manuals section. Upload PDFs in Appliance Manuals, then publish.'
  },
  housesitter: {
    catalog: starterGuideHousesitter,
    label: 'Trusted housesitter guide',
    summary: 'Home routines, pets, local area, children & safety, emergency, manuals, rules',
    hint: 'Built for long stays: pet care, utility emergencies, first aid, local walks, and appliance PDFs when you upload manuals.'
  },
  airbnb: {
    catalog: starterGuideAirbnb,
    label: 'Short-stay guest guide',
    summary: 'Check-in, amenities, local guide, children & safety, emergency, manuals, rules',
    hint: 'Airbnb-ready: accessibility notes, checkout checklist, neighbours & noise, EV charging placeholder, and appliance manuals.'
  },
  both: {
    catalog: starterGuideBoth,
    label: 'Sitters and short-stay guide',
    summary: 'Full guide for any stay length — pets, safety, local, emergency, manuals',
    hint: 'Everything in one template. Remove Pets, EV charging, or Children sections in the Guide Editor if they do not apply.'
  }
};

/**
 * @param {string | undefined | null} useCase
 * @returns {typeof STARTER_GUIDE_BY_USE_CASE.owner}
 */
export function getStarterGuideTemplate(useCase) {
  const key = /** @type {HubUseCase} */ (useCase);
  return STARTER_GUIDE_BY_USE_CASE[key] ?? STARTER_GUIDE_BY_USE_CASE.owner;
}

/**
 * @param {string | undefined | null} useCase
 */
export function getStarterGuideCatalog(useCase) {
  return getStarterGuideTemplate(useCase).catalog;
}
