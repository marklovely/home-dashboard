export const HOME_TIMEZONE = 'Europe/London';

/**
 * @param {Date} date
 */
export function getZonedParts(date, timeZone = HOME_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = formatter.formatToParts(date);
  /** @type {Record<string, string>} */
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

/**
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day
 */
export function formatIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Local calendar date for instant in Europe/London.
 * @param {Date} date
 */
export function localDateKey(date, timeZone = HOME_TIMEZONE) {
  const parts = getZonedParts(date, timeZone);
  return formatIsoDate(parts.year, parts.month, parts.day);
}

/**
 * @param {string} isoDate YYYY-MM-DD
 * @param {number} dayOffset
 */
export function addDaysToIsoDate(isoDate, dayOffset) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + dayOffset, 12, 0, 0));
  return localDateKey(utc);
}

/**
 * @param {Date} asOf
 */
export function computeRange(asOf = new Date()) {
  const from = localDateKey(asOf);
  const to = addDaysToIsoDate(from, 6);
  return { from, to };
}

/**
 * @param {Date} asOf
 */
export function rangeBounds(asOf = new Date()) {
  const { from, to } = computeRange(asOf);
  const start = zonedDateTimeToUtc(from, 0, 0, 0);
  const end = zonedDateTimeToUtc(to, 23, 59, 59);
  return { from, to, startUtc: start, endUtc: end };
}

/**
 * Interpret wall time in Europe/London and return UTC Date (DST-aware via formatter probe).
 * @param {string} isoDate
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 */
export function zonedDateTimeToUtc(isoDate, hour, minute, second) {
  const [year, month, day] = isoDate.split('-').map(Number);
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(new Date(guess));
    const targetMs = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const delta = targetMs - actualMs;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

/**
 * @param {Date} date
 */
export function formatOffsetIso(date, timeZone = HOME_TIMEZONE) {
  const parts = getZonedParts(date, timeZone);
  const isoDate = formatIsoDate(parts.year, parts.month, parts.day);
  const time = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(parts.second).padStart(2, '0')}`;
  const londonOffset = formatLondonOffset(date);
  if (time === '00:00:00' && parts.hour === 0) {
    return `${isoDate}T${time}${londonOffset}`;
  }
  return `${isoDate}T${time}${londonOffset}`;
}

/**
 * @param {Date} date
 */
function formatLondonOffset(date) {
  const utc = date.getTime();
  const parts = getZonedParts(date);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMinutes = Math.round((asUtc - utc) / 60000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
