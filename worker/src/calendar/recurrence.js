import {
  HOME_TIMEZONE,
  formatOffsetIso,
  localDateKey,
  rangeBounds
} from './timezone.js';
import { getIcalExpanderConstructor } from './icalExpanderLoader.js';

/**
 * @param {string} uid
 * @param {string | null} recurrenceId
 */
export function stableEventId(uid, recurrenceId) {
  const base = uid.trim();
  if (!recurrenceId) return base;
  return `${base}#${recurrenceId}`;
}

/**
 * @param {import('ical.js').Event | import('ical-expander').IcalExpanderEvent} eventLike
 */
function isCancelled(eventLike) {
  let status = eventLike.status?.toString?.()?.toLowerCase?.() ?? eventLike.status;
  if (!status && eventLike.component) {
    status = eventLike.component.getFirstPropertyValue('status')?.toString?.()?.toLowerCase?.();
  }
  return status === 'cancelled';
}

/**
 * @param {Date} start
 * @param {Date} end
 * @param {boolean} allDay
 * @param {Date} asOf
 * @param {string} rangeFrom YYYY-MM-DD
 * @param {string} rangeTo YYYY-MM-DD
 */
export function isEventRelevantNow(start, end, allDay, asOf, rangeFrom, rangeTo) {
  if (allDay) {
    const startDay = localDateKey(start);
    const endDay = localDateKey(new Date(end.getTime() - 1));
    if (endDay < rangeFrom || startDay > rangeTo) return false;
    const today = localDateKey(asOf);
    return endDay >= today;
  }
  if (end <= asOf) return false;
  return true;
}

/**
 * @param {import('ical-expander').IcalExpanderEvent} event
 * @param {Date} asOf
 * @param {string} rangeFrom
 * @param {string} rangeTo
 */
function mapSingleEvent(event, asOf, rangeFrom, rangeTo) {
  if (isCancelled(event)) return null;

  const start = event.startDate.toJSDate();
  const end = event.endDate.toJSDate();
  const allDay = Boolean(event.startDate.isDate);

  if (!isEventRelevantNow(start, end, allDay, asOf, rangeFrom, rangeTo)) return null;

  return {
    id: stableEventId(event.uid, null),
    title: (event.summary || 'Busy').trim(),
    start: allDay ? `${localDateKey(start)}T00:00:00+00:00` : formatOffsetIso(start),
    end: allDay ? `${localDateKey(new Date(end.getTime() - 1))}T23:59:59+00:00` : formatOffsetIso(end),
    allDay,
    location: event.location?.trim() || null,
    status: 'confirmed'
  };
}

/**
 * @param {import('ical-expander').IcalExpanderOccurrence} occurrence
 * @param {Date} asOf
 * @param {string} rangeFrom
 * @param {string} rangeTo
 */
function mapOccurrence(occurrence, asOf, rangeFrom, rangeTo) {
  const item = occurrence.item;
  if (isCancelled(item)) return null;

  const start = occurrence.startDate.toJSDate();
  const end = occurrence.endDate.toJSDate();
  const allDay = Boolean(occurrence.startDate.isDate);

  if (!isEventRelevantNow(start, end, allDay, asOf, rangeFrom, rangeTo)) return null;

  const recurrenceId = occurrence.startDate.toICALString();

  return {
    id: stableEventId(item.uid, recurrenceId),
    title: (item.summary || 'Busy').trim(),
    start: allDay ? `${localDateKey(start)}T00:00:00+00:00` : formatOffsetIso(start),
    end: allDay ? `${localDateKey(new Date(end.getTime() - 1))}T23:59:59+00:00` : formatOffsetIso(end),
    allDay,
    location: item.location?.trim() || null,
    status: 'confirmed'
  };
}

function mapSingleEventSafe(event, asOf, rangeFrom, rangeTo) {
  try {
    return mapSingleEvent(event, asOf, rangeFrom, rangeTo);
  } catch {
    return null;
  }
}

function mapOccurrenceSafe(occurrence, asOf, rangeFrom, rangeTo) {
  try {
    return mapOccurrence(occurrence, asOf, rangeFrom, rangeTo);
  } catch {
    return null;
  }
}

/**
 * @param {string} icsText
 * @param {Date} [asOf]
 */
export function parseAndExpandIcs(icsText, asOf = new Date()) {
  const { startUtc, endUtc, from, to } = rangeBounds(asOf);
  const IcalExpander = getIcalExpanderConstructor();
  const expander = new IcalExpander({ ics: icsText, maxIterations: 5000, skipInvalidDates: true });

  let events = [];
  let occurrences = [];
  try {
    ({ events, occurrences } = expander.between(startUtc, endUtc));
  } catch {
    const error = new Error('CALENDAR_PARSE');
    error.code = 'CALENDAR_PARSE';
    throw error;
  }

  /** @type {import('./calendarTypes.js').NormalizedCalendarEvent[]} */
  const normalized = [];

  for (const event of events) {
    const mapped = mapSingleEventSafe(event, asOf, from, to);
    if (mapped) normalized.push(mapped);
  }
  for (const occurrence of occurrences) {
    const mapped = mapOccurrenceSafe(occurrence, asOf, from, to);
    if (mapped) normalized.push(mapped);
  }

  normalized.sort((left, right) => left.start.localeCompare(right.start));

  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    timezone: HOME_TIMEZONE,
    range: { from, to },
    events: normalized,
    stale: false,
    lastUpdated: generatedAt
  };
}

export { rangeBounds, computeRange } from './timezone.js';
