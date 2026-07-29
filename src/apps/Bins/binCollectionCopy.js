/** Collection point (informative, not a command). */
export const BIN_COLLECTION_LOCATION =
  'the end of the road as you turn into the close from Wagtail Road';

export const COUNCIL_RECYCLING_URL = 'https://www.easthants.gov.uk/your-bins';

/** Single collection-information block copy (owner and house sitter). */
export function getCollectionInformationCopy() {
  return {
    title: 'Collection information',
    beginLine: 'Collections normally begin from 6am.',
    locationLine: `Bins are collected from ${BIN_COLLECTION_LOCATION}.`
  };
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
