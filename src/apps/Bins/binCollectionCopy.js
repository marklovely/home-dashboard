import { isTestHubEnvironment } from '../../auth/hubEnvironment.js';
import { readBinScheduleFromProfile } from '../../lib/binScheduleProfile.js';
import { getSiteProfileState } from '../../services/siteProfileService.js';

/** Collection point (informative, not a command). */
export const BIN_COLLECTION_LOCATION =
  'the end of the road as you turn into the close from Wagtail Road';

export const COUNCIL_RECYCLING_URL = 'https://www.easthants.gov.uk/your-bins';

const DEMO_BIN_COLLECTION_LOCATION = 'the usual collection point at the end of your street';

function profileBinCopy() {
  const schedule = readBinScheduleFromProfile(getSiteProfileState()?.profile);
  return {
    location: schedule.collectionLocation.trim(),
    councilUrl: schedule.councilUrl.trim()
  };
}

/** Single collection-information block copy (owner and house sitter). */
export function getCollectionInformationCopy() {
  const profileCopy = profileBinCopy();

  if (isTestHubEnvironment()) {
    const location = profileCopy.location || DEMO_BIN_COLLECTION_LOCATION;
    return {
      title: profileCopy.location ? 'Collection information' : 'Collection information (demo)',
      beginLine: profileCopy.location
        ? 'Collections normally begin from 6am.'
        : 'Demo schedule only — add your dates in the setup wizard or keep the demo.',
      locationLine: `Bins are collected from ${location}.`
    };
  }

  const location = profileCopy.location || BIN_COLLECTION_LOCATION;
  return {
    title: 'Collection information',
    beginLine: 'Collections normally begin from 6am.',
    locationLine: `Bins are collected from ${location}.`
  };
}

/** @returns {string} */
export function getCouncilRecyclingUrl() {
  const profileCopy = profileBinCopy();
  if (profileCopy.councilUrl) return profileCopy.councilUrl;
  if (isTestHubEnvironment()) return 'https://www.example.gov.uk/bins';
  return COUNCIL_RECYCLING_URL;
}

/**
 * @param {import('../services/binCollectionService.js').CollectionEvent} event
 * @param {boolean} houseSitter
 * @param {import('../services/binCollectionService.js').DaysUntilResult} timing
 */
export function getBankHolidayNote(event, houseSitter, timing) {
  if (!event.bankHolidayChange) return null;
  if (houseSitter) {
    return `${timing.weekdayLabel} is a changed collection day for this schedule.`;
  }
  return 'Changed from the normal Friday schedule';
}

/**
 * @param {boolean} houseSitter
 */
export function getMissedBinNote(houseSitter) {
  if (isTestHubEnvironment()) {
    return 'Demo schedule — check your local council website for real missed-bin reporting.';
  }
  if (houseSitter) {
    return 'Missed bins can be reported at easthants.gov.uk by 4pm on the next working day after a collection.';
  }
  return 'Report missed bins at easthants.gov.uk by 4pm on the next working day.';
}

/** @deprecated Use getCollectionInformationCopy */
export const BIN_PUT_OUT_LOCATION = BIN_COLLECTION_LOCATION;

/** @deprecated Use getCollectionInformationCopy */
export function getCollectionTimingIntro(houseSitter) {
  const copy = getCollectionInformationCopy();
  if (houseSitter) {
    return `${copy.beginLine} ${copy.locationLine}`;
  }
  return `${copy.beginLine.replace('normally begin', 'from 6am')} ${copy.locationLine.replace('are collected from', 'at')}`;
}
