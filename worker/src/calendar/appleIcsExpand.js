import ICAL from 'ical.js';
import { normalizeIcsText } from './icsNormalize.js';

const MAX_RECURRENCE_ITERATIONS = 5000;

/**
 * @param {import('ical.js').Component} root
 */
function registerIcsTimezones(root) {
  for (const vtimezone of root.getAllSubcomponents('vtimezone')) {
    try {
      const tz = new ICAL.Timezone(vtimezone);
      if (!ICAL.TimezoneService.has(tz.tzid)) {
        ICAL.TimezoneService.register(tz);
      }
    } catch {
      /* duplicate or invalid TZ */
    }
  }
}

/**
 * @param {{ startDate: import('ical.js').Time; endDate: import('ical.js').Time }} eventLike
 */
function getEventTimes(eventLike) {
  const startTime = eventLike.startDate.toJSDate().getTime();
  let endTime = eventLike.endDate.toJSDate().getTime();
  if (eventLike.endDate.isDate && endTime > startTime) {
    endTime -= 1;
  }
  return { startTime, endTime };
}

/**
 * @param {number} startTime
 * @param {number} endTime
 * @param {Date | undefined} after
 * @param {Date | undefined} before
 */
function isWithinRange(startTime, endTime, after, before) {
  return (!after || endTime >= after.getTime()) && (!before || startTime <= before.getTime());
}

/**
 * @param {import('ical.js').Component} root
 * @param {Date} after
 * @param {Date} before
 */
export function expandIcsComponentBetween(root, after, before) {
  registerIcsTimezones(root);

  /** @type {import('ical.js').Event[]} */
  const events = [];
  /** @type {{ item: import('ical.js').Event; startDate: import('ical.js').Time; endDate: import('ical.js').Time }[]} */
  const occurrences = [];

  const parsed = root.getAllSubcomponents('vevent').map((vevent) => new ICAL.Event(vevent));
  const exceptions = parsed.filter((event) => event.isRecurrenceException());

  for (const event of parsed) {
    if (event.isRecurrenceException()) continue;

    try {
      event.startDate.toJSDate();
      event.endDate.toJSDate();
    } catch {
      continue;
    }

    if (event.isRecurring()) {
      /** @type {number[]} */
      const exdates = [];
      event.component.getAllProperties('exdate').forEach((prop) => {
        try {
          exdates.push(prop.getFirstValue().toJSDate().getTime());
        } catch {
          /* skip bad exdate */
        }
      });

      const iterator = event.iterator();
      let next;
      let iterations = 0;

      while ((next = iterator.next()) && iterations < MAX_RECURRENCE_ITERATIONS) {
        iterations += 1;
        let occurrence;
        try {
          occurrence = event.getOccurrenceDetails(next);
        } catch {
          continue;
        }

        const { startTime, endTime } = getEventTimes(occurrence);
        if (before && startTime > before.getTime()) break;
        if (!isWithinRange(startTime, endTime, after, before)) continue;
        if (exdates.includes(startTime)) continue;

        const exception = exceptions.find((ex) => {
          try {
            return (
              ex.uid === event.uid &&
              ex.recurrenceId.toJSDate().getTime() === occurrence.startDate.toJSDate().getTime()
            );
          } catch {
            return false;
          }
        });

        if (exception) {
          events.push(exception);
        } else {
          occurrences.push({
            item: event,
            startDate: occurrence.startDate,
            endDate: occurrence.endDate
          });
        }
      }
      continue;
    }

    const { startTime, endTime } = getEventTimes(event);
    if (isWithinRange(startTime, endTime, after, before)) {
      events.push(event);
    }
  }

  return { events, occurrences };
}

/**
 * @param {string} icsText
 * @param {Date} after
 * @param {Date} before
 */
export function parseIcsRoot(icsText, after, before) {
  const normalized = normalizeIcsText(icsText);
  const jcal = ICAL.parse(normalized);
  const root = new ICAL.Component(jcal);
  return expandIcsComponentBetween(root, after, before);
}
