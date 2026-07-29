/**
 * Informative copy for the Bin Collection app (not reminders or commands).
 * @param {boolean} houseSitter
 */
export function getCollectionTimingIntro(houseSitter) {
  if (houseSitter) {
    return 'Collections are normally from 6am. Bins are usually at the end of the road the night before.';
  }
  return 'Collection from 6am. Bins at the end of the road the night before.';
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
 * @param {string} binDescription
 * @param {boolean} houseSitter
 */
export function getHouseSitterCollectionSentence(displayName, timing, binDescription, houseSitter) {
  if (!houseSitter) return null;
  const nameLower = displayName.replace('& glass', 'and glass');
  let when;
  if (timing.days === 0) when = 'today';
  else if (timing.days === 1) when = 'tomorrow';
  else when = `on ${timing.dateLabel}`;
  const article = timing.days === 1 ? 'is' : 'are';
  return `${nameLower} is collected ${when}. The ${binDescription.toLowerCase()} ${article} used for this collection.`;
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
