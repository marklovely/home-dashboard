/**
 * Expand bin collection dates from a start date and repeat interval.
 */

/** @typedef {'none' | '1week' | '2weeks' | '1month' | 'custom'} BinRepeatPreset */

export const BIN_REPEAT_PRESETS = [
  { value: 'none', label: 'Does not repeat' },
  { value: '1week', label: 'Every week' },
  { value: '2weeks', label: 'Every 2 weeks' },
  { value: '1month', label: 'Every month' },
  { value: 'custom', label: 'Custom (weeks)' }
];

export const DEFAULT_BIN_REPEAT_WEEKS = 3;
export const MIN_BIN_REPEAT_WEEKS = 1;
export const MAX_BIN_REPEAT_WEEKS = 52;
export const MAX_BIN_REPEAT_OCCURRENCES = 200;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {string} iso
 * @returns {Date}
 */
export function parseIsoLocalDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * @param {Date} date
 * @returns {string}
 */
export function formatIsoLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @param {string} startDate
 * @param {number} months
 * @returns {string}
 */
export function addMonthsIso(startDate, months) {
  const date = parseIsoLocalDate(startDate);
  date.setMonth(date.getMonth() + months);
  return formatIsoLocalDate(date);
}

/**
 * @param {BinRepeatPreset | string} repeatId
 * @param {number} [customWeeks]
 * @returns {number | null} Days between occurrences, or null for non-repeating.
 */
export function repeatIntervalDays(repeatId, customWeeks = DEFAULT_BIN_REPEAT_WEEKS) {
  if (repeatId === '1week') return 7;
  if (repeatId === '2weeks') return 14;
  if (repeatId === 'custom') {
    const weeks = Math.min(
      MAX_BIN_REPEAT_WEEKS,
      Math.max(MIN_BIN_REPEAT_WEEKS, Math.round(customWeeks) || DEFAULT_BIN_REPEAT_WEEKS)
    );
    return weeks * 7;
  }
  return null;
}

/**
 * @param {Object} options
 * @param {string} options.startDate YYYY-MM-DD
 * @param {BinRepeatPreset | string} options.repeatId
 * @param {number} [options.customWeeks]
 * @param {string} options.untilDate YYYY-MM-DD inclusive upper bound for generated dates
 * @returns {string[]}
 */
export function expandBinRepeatDates({ startDate, repeatId, customWeeks, untilDate }) {
  if (!ISO_DATE.test(startDate)) return [];
  if (!ISO_DATE.test(untilDate)) return [startDate];
  if (repeatId === 'none' || !repeatId) return [startDate];
  if (startDate > untilDate) return [startDate];

  /** @type {string[]} */
  const dates = [];
  let cursor = startDate;

  if (repeatId === '1month') {
    while (cursor <= untilDate && dates.length < MAX_BIN_REPEAT_OCCURRENCES) {
      dates.push(cursor);
      const next = addMonthsIso(cursor, 1);
      if (next <= cursor) break;
      cursor = next;
    }
    return dates;
  }

  const stepDays = repeatIntervalDays(repeatId, customWeeks);
  if (!stepDays) return [startDate];

  while (cursor <= untilDate && dates.length < MAX_BIN_REPEAT_OCCURRENCES) {
    dates.push(cursor);
    const nextDate = parseIsoLocalDate(cursor);
    nextDate.setDate(nextDate.getDate() + stepDays);
    cursor = formatIsoLocalDate(nextDate);
  }

  return dates;
}

/**
 * @param {Object} options
 * @param {string} options.startDate
 * @param {'rubbish' | 'recycling' | 'gardenWaste'} options.type
 * @param {BinRepeatPreset | string} options.repeatId
 * @param {number} [options.customWeeks]
 * @param {string} options.untilDate
 * @param {boolean} [options.bankHolidayChange]
 * @returns {{ date: string, type: 'rubbish' | 'recycling' | 'gardenWaste', bankHolidayChange: boolean }[]}
 */
export function buildBinScheduleEntriesFromRepeat({
  startDate,
  type,
  repeatId,
  customWeeks,
  untilDate,
  bankHolidayChange = false
}) {
  const dates = expandBinRepeatDates({ startDate, repeatId, customWeeks, untilDate });
  return dates.map((date) => ({
    date,
    type,
    bankHolidayChange: type !== 'gardenWaste' && bankHolidayChange
  }));
}

/**
 * Repeat-until must not be before the first generated date. Stale "schedule
 * valid until" values (already in the past) are ignored so a new year of dates
 * still expands.
 *
 * @param {string} startDate
 * @param {string} [explicitUntil]
 * @param {string} [fallbackUntil]
 */
export function resolveRepeatUntilDate(startDate, explicitUntil = '', fallbackUntil = '') {
  if (!ISO_DATE.test(startDate)) return '';
  for (const candidate of [explicitUntil, fallbackUntil]) {
    const value = String(candidate ?? '').trim();
    if (ISO_DATE.test(value) && value >= startDate) return value;
  }
  return defaultRepeatUntilDate(startDate);
}

/**
 * Default repeat-until date: one year after start (matches typical council calendars).
 * @param {string} startDate
 */
export function defaultRepeatUntilDate(startDate) {
  if (!ISO_DATE.test(startDate)) return '';
  return addMonthsIso(startDate, 12);
}
