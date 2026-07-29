/** Where bins go on collection eve (informative, not a command). */
export const BIN_PUT_OUT_LOCATION =
  'the end of the road as you turn into the close from Wagtail Road';

/**
 * Informative copy for the Bin Collection app (not reminders or commands).
 * @param {boolean} houseSitter
 */
export function getCollectionTimingIntro(houseSitter) {
  if (houseSitter) {
    return `Collections are normally from 6am. Bins are usually at ${BIN_PUT_OUT_LOCATION} the night before.`;
  }
  return `Collection from 6am. Bins at ${BIN_PUT_OUT_LOCATION} the night before.`;
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
 * @param {string} displayName
 * @param {import('../services/binCollectionService.js').DaysUntilResult} timing
 * @param {string} binLabel Emoji + bin wording from `formatBinLabel`
 * @param {boolean} houseSitter
 */
export function getHouseSitterCollectionSentence(displayName, timing, binLabel, houseSitter) {
  if (!houseSitter) return null;
  const nameLower = displayName.replace('& glass', 'and glass');
  let when;
  if (timing.days === 0) when = 'today';
  else if (timing.days === 1) when = 'tomorrow';
  else when = `on ${timing.dateLabel}`;
  return `${nameLower} is collected ${when}. Use ${binLabel} for this collection.`;
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
