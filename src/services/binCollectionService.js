import {
  gardenWasteCollections,
  gardenWasteScheduleMeta
} from '../data/binCollections/gardenWasteCollections.js';
import {
  demoGardenWasteCollections,
  demoGardenWasteScheduleMeta,
  demoHouseholdCollections,
  demoHouseholdScheduleMeta
} from '../data/binCollections/demoBinCollections.js';
import {
  householdCollections,
  householdScheduleMeta
} from '../data/binCollections/householdCollections.js';
import { isTestHubEnvironment } from '../auth/hubEnvironment.js';
import {
  getBinAlertHoursBefore,
  hasConfiguredBinSchedule,
  readBinScheduleFromProfile
} from '../lib/binScheduleProfile.js';
import { getSiteProfileState } from './siteProfileService.js';
import { getBinAppearance } from '../lib/binAppearanceProfile.js';
import {
  COLLECTION_TYPES,
  getCollectionType
} from '../data/binCollections/collectionTypes.js';
import {
  getBinCollectionLocationPhrase
} from '../apps/Bins/binCollectionCopy.js';
import { isBinAlertDismissed } from './binAlertDismissalService.js';

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

/** @returns {import('../data/binCollections/collectionTypes.js').HouseholdCollectionEntry[]} */
function activeHouseholdCollections() {
  const profileSchedule = readBinScheduleFromProfile(getSiteProfileState()?.profile);
  if (hasConfiguredBinSchedule(profileSchedule)) {
    return profileSchedule.household;
  }
  return isTestHubEnvironment() ? demoHouseholdCollections : householdCollections;
}

/** @returns {import('../data/binCollections/collectionTypes.js').GardenWasteCollectionEntry[]} */
function activeGardenWasteCollections() {
  const profileSchedule = readBinScheduleFromProfile(getSiteProfileState()?.profile);
  if (hasConfiguredBinSchedule(profileSchedule)) {
    return profileSchedule.gardenWaste;
  }
  return isTestHubEnvironment() ? demoGardenWasteCollections : gardenWasteCollections;
}

function activeHouseholdScheduleMeta() {
  const profileSchedule = readBinScheduleFromProfile(getSiteProfileState()?.profile);
  if (hasConfiguredBinSchedule(profileSchedule)) {
    return {
      validFrom: profileSchedule.validFrom || profileSchedule.household[0]?.date || '',
      validUntil:
        profileSchedule.validUntil ||
        profileSchedule.household[profileSchedule.household.length - 1]?.date ||
        profileSchedule.gardenWaste[profileSchedule.gardenWaste.length - 1]?.date ||
        '',
      source: 'Your schedule',
      calendar: '',
      normalCollectionDay: profileSchedule.normalCollectionDay || '',
      putOutBy: '',
      maintenanceFiles: []
    };
  }
  return isTestHubEnvironment() ? demoHouseholdScheduleMeta : householdScheduleMeta;
}

function activeGardenWasteScheduleMeta() {
  const profileSchedule = readBinScheduleFromProfile(getSiteProfileState()?.profile);
  if (hasConfiguredBinSchedule(profileSchedule)) {
    return {
      validFrom: profileSchedule.validFrom || profileSchedule.gardenWaste[0]?.date || '',
      validUntil:
        profileSchedule.validUntil ||
        profileSchedule.gardenWaste[profileSchedule.gardenWaste.length - 1]?.date ||
        '',
      source: 'Your schedule',
      round: '',
      normalCollectionDay: profileSchedule.normalCollectionDay || '',
      maintenanceFiles: []
    };
  }
  return isTestHubEnvironment() ? demoGardenWasteScheduleMeta : gardenWasteScheduleMeta;
}

/** @returns {CollectionEvent[]} */
function buildAllEvents() {
  /** @type {CollectionEvent[]} */
  const events = [];
  for (const entry of activeHouseholdCollections()) {
    events.push({
      date: entry.date,
      type: entry.type,
      bankHolidayChange: entry.bankHolidayChange,
      stream: 'household'
    });
  }
  for (const entry of activeGardenWasteCollections()) {
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

function getAllEvents() {
  return buildAllEvents();
}

function getScheduleValidUntil() {
  return activeHouseholdScheduleMeta().validUntil;
}

function lastScheduledCollectionDate() {
  const events = getAllEvents();
  return events[events.length - 1]?.date ?? '';
}

/**
 * True only when nothing remains to show. A stale validUntil must not hide
 * collection dates that are still ahead (owners often add a new year without
 * clearing the old "schedule valid until" field).
 *
 * @param {string} asOfIso YYYY-MM-DD
 * @param {string} validUntilIso
 * @param {string} lastEventIso
 */
export function isCollectionCalendarExpired(asOfIso, validUntilIso, lastEventIso) {
  if (lastEventIso && asOfIso <= lastEventIso) return false;
  if (validUntilIso && asOfIso <= validUntilIso) return false;
  return Boolean(validUntilIso || lastEventIso);
}

/**
 * @param {Date} [asOfDate]
 */
export function isScheduleExpired(asOfDate = new Date()) {
  const asOfIso = formatIsoFromDate(startOfLocalDay(asOfDate));
  return isCollectionCalendarExpired(asOfIso, getScheduleValidUntil(), lastScheduledCollectionDate());
}

export function getScheduleMetadata() {
  const household = activeHouseholdCollections();
  const garden = activeGardenWasteCollections();
  const validUntil = getScheduleValidUntil();
  return {
    household: activeHouseholdScheduleMeta(),
    gardenWaste: activeGardenWasteScheduleMeta(),
    validUntil,
    lastHouseholdDate: household[household.length - 1]?.date,
    lastGardenWasteDate: garden[garden.length - 1]?.date
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
  return firstOnOrAfter(asOfDate, getAllEvents());
}

/**
 * @param {Date} [asOfDate]
 * @returns {CollectionEvent | null}
 */
export function getNextHouseholdCollection(asOfDate = new Date()) {
  if (isScheduleExpired(asOfDate)) return null;
  const household = getAllEvents().filter((event) => event.stream === 'household');
  return firstOnOrAfter(asOfDate, household);
}

/**
 * @param {Date} [asOfDate]
 * @returns {CollectionEvent | null}
 */
export function getNextGardenWasteCollection(asOfDate = new Date()) {
  if (isScheduleExpired(asOfDate)) return null;
  const garden = getAllEvents().filter((event) => event.stream === 'garden');
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
  return getAllEvents().filter((event) => event.date >= asOfIso).slice(0, count);
}

/**
 * Enriched event for UI.
 * @param {CollectionEvent} event
 * @param {Date} asOfDate
 */
export function describeCollectionEvent(event, asOfDate = new Date()) {
  const typeDef = getCollectionType(event.type);
  const schedule = readBinScheduleFromProfile(getSiteProfileState()?.profile);
  const appearance = getBinAppearance(event.type, schedule);
  const timing = getDaysUntil(event.date, asOfDate);
  return {
    ...event,
    displayName: typeDef.displayName,
    emoji: typeDef.emoji,
    binDescription: appearance.description,
    binLabel: appearance.label,
    colorId: appearance.colorId,
    colorLabel: appearance.colorLabel,
    colorHex: appearance.hex,
    iconId: typeDef.iconId,
    cssModifier: typeDef.cssModifier,
    timing
  };
}

/** Hour bins are normally put out (matches collection information copy). */
export const BIN_COLLECTION_PUT_OUT_HOUR = 6;

/** Hours after put-out time when reminders automatically stop (unless dismissed earlier). */
export const BIN_COLLECTION_ALERT_GRACE_HOURS = 2;

/**
 * @typedef {Object} BinCollectionAlert
 * @property {string} label Short line for cards and banners
 * @property {string} title Banner heading
 * @property {string} detail Which bins to put out
 * @property {string} putOutLine When to put bins out
 * @property {string} locationLine Where bins are collected
 * @property {string} whenLabel today | tomorrow | weekday
 * @property {string} colorLabel Human-readable bin colour
 * @property {string} colorHex Hex colour for icons and accents
 * @property {CollectionEvent} event
 */

/**
 * @param {string} collectionDateIso
 * @param {Date} [asOfDate]
 */
export function formatBinAlertPutOutLine(collectionDateIso, asOfDate = new Date()) {
  const timing = getDaysUntil(collectionDateIso, asOfDate);
  const dateLabel = formatCollectionDateLabel(collectionDateIso);
  const hour = BIN_COLLECTION_PUT_OUT_HOUR;

  if (timing.days === 0) {
    return `Put bins out by ${hour}am today`;
  }
  if (timing.days === 1) {
    return `Put bins out by ${hour}am tomorrow (${dateLabel})`;
  }
  return `Put bins out by ${hour}am on ${dateLabel}`;
}

/** @returns {string} */
export function formatBinAlertLocationLine() {
  return `Collection point: ${getBinCollectionLocationPhrase()}`;
}

/**
 * @param {string} isoDate
 * @returns {Date}
 */
export function getCollectionPutOutTime(isoDate) {
  const date = parseLocalDate(isoDate);
  date.setHours(BIN_COLLECTION_PUT_OUT_HOUR, 0, 0, 0);
  return date;
}

/**
 * @param {string} isoDate
 * @returns {Date}
 */
export function getCollectionAlertEndTime(isoDate) {
  const end = getCollectionPutOutTime(isoDate);
  end.setHours(end.getHours() + BIN_COLLECTION_ALERT_GRACE_HOURS);
  return end;
}

/**
 * @param {string} collectionDateIso
 * @param {Date} asOfDate
 * @param {number} alertHoursBefore
 */
export function isBinCollectionInAlertWindow(collectionDateIso, asOfDate, alertHoursBefore) {
  if (alertHoursBefore <= 0) return false;

  const collectionDay = startOfLocalDay(parseLocalDate(collectionDateIso));
  const asOfDay = startOfLocalDay(asOfDate);
  if (asOfDay.getTime() > collectionDay.getTime()) return false;

  if (asOfDay.getTime() === collectionDay.getTime()) {
    return asOfDate.getTime() < getCollectionAlertEndTime(collectionDateIso).getTime();
  }

  const putOutTime = getCollectionPutOutTime(collectionDateIso);
  const msUntil = putOutTime.getTime() - asOfDate.getTime();
  return msUntil > 0 && msUntil <= alertHoursBefore * 3600000;
}

/**
 * @param {Date} [asOfDate]
 * @param {{ houseSitter?: boolean }} [options]
 * @returns {BinCollectionAlert | null}
 */
export function getBinCollectionAlert(asOfDate = new Date(), options = {}) {
  const { houseSitter = false } = options;

  if (isScheduleExpired(asOfDate)) return null;

  const schedule = readBinScheduleFromProfile(getSiteProfileState()?.profile);
  const alertHoursBefore = getBinAlertHoursBefore(schedule);
  if (alertHoursBefore <= 0) return null;

  const next = getNextCollection(asOfDate);
  if (!next || !isBinCollectionInAlertWindow(next.date, asOfDate, alertHoursBefore)) {
    return null;
  }

  if (isBinAlertDismissed(next.date)) {
    return null;
  }

  const described = describeCollectionEvent(next, asOfDate);
  const typeDef = getCollectionType(next.type);
  const appearance = getBinAppearance(next.type, schedule);
  const whenPhrase =
    described.timing.days === 0
      ? 'today'
      : described.timing.days === 1
        ? 'tomorrow'
        : `on ${described.timing.weekdayLabel}`;

  let label = `${typeDef.displayName} ${whenPhrase} — ${appearance.description}`;
  if (next.bankHolidayChange && houseSitter) {
    label = `${typeDef.displayName} ${whenPhrase} (changed day) — ${appearance.description}`;
  }

  return {
    label,
    title: `${appearance.colorLabel} bin collection ${whenPhrase}`,
    detail: appearance.description,
    putOutLine: formatBinAlertPutOutLine(next.date, asOfDate),
    locationLine: formatBinAlertLocationLine(),
    colorLabel: appearance.colorLabel,
    colorHex: appearance.hex,
    whenLabel:
      described.timing.days === 0
        ? 'today'
        : described.timing.days === 1
          ? 'tomorrow'
          : described.timing.weekdayLabel.toLowerCase(),
    event: next
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
  const appearance = getBinAppearance(next.type);

  let subtitle = described.timing.relative;
  if (next.bankHolidayChange) {
    subtitle = houseSitter
      ? `${described.timing.weekdayLabel} · changed collection day`
      : `${described.timing.weekdayLabel} · changed from normal schedule`;
  }

  const binLine = appearance.label;
  const lines = [typeDef.displayName, subtitle, binLine];

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

  const alert = getBinCollectionAlert(asOfDate, options);

  return {
    title: typeDef.displayName,
    subtitle: lines.slice(1).join(' · '),
    alert: alert ? { label: alert.label, prominent: true } : null
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
      date: parseLocalDate(getScheduleValidUntil()),
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

export {
  buildAllEvents as __buildAllCollectionEventsForTests,
  COLLECTION_TYPES,
  householdCollections,
  gardenWasteCollections
};
