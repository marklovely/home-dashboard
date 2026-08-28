import { addDaysToIsoDate, HOME_TIMEZONE, zonedDateTimeToUtc } from '../calendar/timezone.js';

export const DEFAULT_ACCESS_LEAD_DAYS = 7;
export const DEFAULT_ACCESS_GRACE_DAYS = 1;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {string} isoDate
 * @returns {boolean}
 */
export function isIsoDate(isoDate) {
  return ISO_DATE_RE.test(String(isoDate ?? '').trim());
}

/**
 * @param {string} sitStart YYYY-MM-DD inclusive
 * @param {string} sitEnd YYYY-MM-DD inclusive
 * @param {{ accessLeadDays?: number, accessGraceDays?: number, timeZone?: string }} [options]
 */
export function computeStayWindowTimestamps(sitStart, sitEnd, options = {}) {
  const leadDays = options.accessLeadDays ?? DEFAULT_ACCESS_LEAD_DAYS;
  const graceDays = options.accessGraceDays ?? DEFAULT_ACCESS_GRACE_DAYS;
  const timeZone = options.timeZone ?? HOME_TIMEZONE;

  const accessOpensDate = addDaysToIsoDate(sitStart, -leadDays);
  const accessClosesDate = addDaysToIsoDate(sitEnd, graceDays + 1);

  return {
    accessOpensAt: Math.floor(zonedDateTimeToUtc(accessOpensDate, 0, 0, 0).getTime() / 1000),
    accessClosesAt: Math.floor(zonedDateTimeToUtc(accessClosesDate, 0, 0, 0).getTime() / 1000),
    secretsOpensAt: Math.floor(zonedDateTimeToUtc(sitStart, 0, 0, 0).getTime() / 1000),
    secretsClosesAt: Math.floor(zonedDateTimeToUtc(accessClosesDate, 0, 0, 0).getTime() / 1000),
    timeZone
  };
}

/**
 * @param {string} sitStart
 * @param {string} sitEnd
 * @returns {string | null}
 */
export function validateStayDateRange(sitStart, sitEnd) {
  if (!isIsoDate(sitStart) || !isIsoDate(sitEnd)) {
    return 'Sit dates must use YYYY-MM-DD format.';
  }
  if (sitEnd < sitStart) {
    return 'Sit end date must be on or after the start date.';
  }
  return null;
}
