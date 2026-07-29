import {
  gardenWasteCollections,
  gardenWasteScheduleMeta
} from '../data/binCollections/gardenWasteCollections.js';
import {
  householdCollections,
  householdScheduleMeta
} from '../data/binCollections/householdCollections.js';
import { COLLECTION_TYPES, getCollectionType } from '../data/binCollections/collectionTypes.js';

/** @typedef {import('../data/binCollections/collectionTypes.js').CollectionTypeId} CollectionTypeId */

/**
 * @typedef {Object} CollectionEvent
 * @property {string} date ISO YYYY-MM-DD
 * @property {CollectionTypeId} type
 * @property {boolean} bankHolidayChange
 * @property {'household' | 'garden'} stream
 */

/**
 * @typedef {Object} DaysUntilResult
 * @property {number} days Calendar-day difference (0 = today)
 * @property {string} relative 'Today' | 'Tomorrow' | 'In N days' | 'N days ago'
 * @property {string} dateLabel e.g. 'Friday 31 July'
 * @property {string} weekdayLabel e.g. 'Friday'
 */

/**
 * @param {string} isoDate YYYY-MM-DD
 * @returns {Date} Local midnight on that calendar day
 */
export function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * @param {Date} date
 * @returns {Date}
 */
export function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * @param {string} isoDate
 * @returns {string}
 */
export function toIsoDateString(isoDate) {
  return isoDate.slice(0, 10);
}

/**
 * @param {Date} date
 * @returns {string}
 */
export function formatIsoFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @param {string} isoDate
 * @returns {string}
 */
export function formatCollectionDateLabel(isoDate) {
  const date = parseLocalDate(isoDate);
  return date
    .toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
    .replace(',', '');
}

/**
 * @param {string} isoDate
 * @returns {string}
 */
export function formatWeekdayOnly(isoDate) {
  return parseLocalDate(isoDate).toLocaleDateString('en-GB', { weekday: 'long' });
}

/** @returns {CollectionEvent[]} */
function buildAllEvents() {
  /** @type {CollectionEvent[]} */
  const events = [];
  for (const entry of householdCollections) {
    events.push({
      date: entry.date,
      type: entry.type,
      bankHolidayChange: entry.bankHolidayChange,
      stream: 'household'
    });
  }
  for (const entry of gardenWasteCollections) {
    events.push({
      date: entry.date,
      type: 'gardenWaste',
      bankHolidayChange: false,
      stream: 'garden'
    });
  }
  events.sort((left, right) => left.date.localeCompare(right.date));
  return events;
}

const ALL_EVENTS = buildAllEvents();

const SCHEDULE_VALID_UNTIL = householdScheduleMeta.validUntil;

/**
 * @param {Date} [asOfDate]
 */
export function isScheduleExpired(asOfDate = new Date()) {
  const asOf = startOfLocalDay(asOfDate);
  const until = parseLocalDate(SCHEDULE_VALID_UNTIL);
  return asOf > until;
}

export function getScheduleMetadata() {
  return {
    household: householdScheduleMeta,
    gardenWaste: gardenWasteScheduleMeta,
    validUntil: SCHEDULE_VALID_UNTIL,
    lastHouseholdDate: householdCollections[householdCollections.length - 1]?.date,
    lastGardenWasteDate: gardenWasteCollections[gardenWasteCollections.length - 1]?.date
  };
}

/**
 * @param {string} collectionDateIso
 * @param {Date} [asOfDate]
 * @returns {DaysUntilResult}
 */
export function getDaysUntil(collectionDateIso, asOfDate = new Date()) {
  const asOf = startOfLocalDay(asOfDate);
  const target = startOfLocalDay(parseLocalDate(collectionDateIso));
  const diffDays = Math.round((target.getTime() - asOf.getTime()) / 86400000);
  const dateLabel = formatCollectionDateLabel(collectionDateIso);
  const weekdayLabel = formatWeekdayOnly(collectionDateIso);

  if (diffDays === 0) {
    return { days: 0, relative: 'Today', dateLabel, weekdayLabel };
  }
  if (diffDays === 1) {
    return { days: 1, relative: 'Tomorrow', dateLabel, weekdayLabel };
  }
  if (diffDays > 1) {
    return {
      days: diffDays,
      relative: `In ${diffDays} days`,
      dateLabel,
      weekdayLabel
    };
  }
  return {
    days: diffDays,
    relative: `${Math.abs(diffDays)} days ago`,
    dateLabel,
    weekdayLabel
  };
}

/**
 * @param {Date} asOfDate
 * @param {CollectionEvent[]} events
 * @returns {CollectionEvent | null}
 */
function firstOnOrAfter(asOfDate, events) {
  const asOfIso = formatIsoFromDate(startOfLocalDay(asOfDate));
  return events.find((event) => event.date >= asOfIso) ?? null;
}

/**
 * @param {Date} [asOfDate]
 * @returns {CollectionEvent | null}
 */
export function getNextCollection(asOfDate = new Date()) {
  if (isScheduleExpired(asOfDate)) return null;
  return firstOnOrAfter(asOfDate, ALL_EVENTS);
}

/**
 * @param {Date} [asOfDate]
 * @returns {CollectionEvent | null}
 */
export function getNextHouseholdCollection(asOfDate = new Date()) {
  if (isScheduleExpired(asOfDate)) return null;
  const household = ALL_EVENTS.filter((event) => event.stream === 'household');
  return firstOnOrAfter(asOfDate, household);
}

/**
 * @param {Date} [asOfDate]
 * @returns {CollectionEvent | null}
 */
export function getNextGardenWasteCollection(asOfDate = new Date()) {
  if (isScheduleExpired(asOfDate)) return null;
  const garden = ALL_EVENTS.filter((event) => event.stream === 'garden');
  return firstOnOrAfter(asOfDate, garden);
}

/**
 * @param {Date} [asOfDate]
 * @param {number} [count]
 * @returns {CollectionEvent[]}
 */
export function getUpcomingCollections(asOfDate = new Date(), count = 6) {
  if (isScheduleExpired(asOfDate)) return [];
  const asOfIso = formatIsoFromDate(startOfLocalDay(asOfDate));
  return ALL_EVENTS.filter((event) => event.date >= asOfIso).slice(0, count);
}

/**
 * Enriched event for UI.
 * @param {CollectionEvent} event
 * @param {Date} asOfDate
 */
export function describeCollectionEvent(event, asOfDate = new Date()) {
  const typeDef = getCollectionType(event.type);
  const timing = getDaysUntil(event.date, asOfDate);
  return {
    ...event,
    displayName: typeDef.displayName,
    binDescription: typeDef.binDescription,
    iconId: typeDef.iconId,
    cssModifier: typeDef.cssModifier,
    timing
  };
}

/**
 * @param {Date} [asOfDate]
 * @param {{ houseSitter?: boolean }} [options]
 */
export function getBinCollectionHomeSummary(asOfDate = new Date(), options = {}) {
  const { houseSitter = false } = options;

  if (isScheduleExpired(asOfDate)) {
    return {
      title: 'Bin Collection',
      subtitle: 'Calendar update needed'
    };
  }

  const next = getNextCollection(asOfDate);
  if (!next) {
    return {
      title: 'Bin Collection',
      subtitle: 'No upcoming collections'
    };
  }

  const described = describeCollectionEvent(next, asOfDate);
  const typeDef = getCollectionType(next.type);

  let subtitle = described.timing.relative;
  if (next.bankHolidayChange) {
    subtitle = houseSitter
      ? `${described.timing.weekdayLabel} · changed collection day`
      : `${described.timing.weekdayLabel} · changed from normal schedule`;
  }

  const lines = [typeDef.displayName, subtitle, typeDef.binDescription];

  const gardenSoon = getNextGardenWasteCollection(asOfDate);
  if (
    gardenSoon &&
    gardenSoon.date !== next.date &&
    getDaysUntil(gardenSoon.date, asOfDate).days <= 7
  ) {
    const gardenTiming = getDaysUntil(gardenSoon.date, asOfDate);
    const gardenWhen =
      gardenTiming.days === 0
        ? 'today'
        : gardenTiming.days === 1
          ? 'tomorrow'
          : gardenTiming.weekdayLabel;
    lines.push(`Garden waste ${gardenWhen}`);
  }

  return {
    title: typeDef.displayName,
    subtitle: lines.slice(1).join(' · ')
  };
}

/**
 * @param {Date} [referenceDate]
 * @returns {import('../types/app.js').AppSummary}
 */
export function getBinCollectionSummary(referenceDate = new Date()) {
  return getBinCollectionHomeSummary(referenceDate, { houseSitter: false });
}

/** @deprecated Use getNextCollection */
export function getUpcomingBinCollection(referenceDate = new Date()) {
  const next = getNextCollection(referenceDate);
  if (!next) {
    return {
      stream: 'none',
      label: 'Bin Collection',
      emoji: '',
      date: parseLocalDate(SCHEDULE_VALID_UNTIL),
      relative: 'Calendar update needed'
    };
  }
  const described = describeCollectionEvent(next, referenceDate);
  return {
    stream: next.type,
    label: described.displayName,
    emoji: '',
    date: parseLocalDate(next.date),
    relative: described.timing.relative,
    event: next
  };
}

export { ALL_EVENTS as __allCollectionEventsForTests, COLLECTION_TYPES, householdCollections, gardenWasteCollections };
