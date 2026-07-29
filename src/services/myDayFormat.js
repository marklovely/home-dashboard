export const MY_DAY_TIMEZONE = 'Europe/London';
export const MY_DAY_OWNER_NAME = 'Mark';

/**
 * @param {Date} [date]
 */
export function greetingForTime(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: MY_DAY_TIMEZONE,
      hour: 'numeric',
      hourCycle: 'h23'
    }).format(date)
  );
  const salutation = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `${salutation} ${MY_DAY_OWNER_NAME}`;
}

/**
 * @param {string} iso
 */
export function localDateKeyFromIso(iso, timeZone = MY_DAY_TIMEZONE) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    date
  );
}

/**
 * @param {string} iso
 */
export function formatTimeLabel(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MY_DAY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(date);
}

/**
 * @param {string} isoDate YYYY-MM-DD
 */
export function formatDayHeading(isoDate, reference = new Date()) {
  const today = localDateKeyFromIso(reference.toISOString());
  const tomorrowDate = new Date(reference);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKeyFromIso(tomorrowDate.toISOString());
  if (isoDate === today) return 'Today';
  if (isoDate === tomorrow) return 'Tomorrow';
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * @param {import('./myDayTypes.js').MyDayEvent} event
 */
export function formatEventTimeRange(event) {
  if (event.allDay) return 'All day';
  const start = formatTimeLabel(event.start);
  const end = formatTimeLabel(event.end);
  return `${start}–${end}`;
}

/**
 * @param {import('./myDayTypes.js').MyDayEvent} event
 * @param {Date} asOf
 */
export function isEventHappeningNow(event, asOf = new Date()) {
  const now = asOf.getTime();
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();
  if (event.allDay) {
    const key = localDateKeyFromIso(asOf.toISOString());
    const eventStartDay = localDateKeyFromIso(event.start);
    const eventEndDay = localDateKeyFromIso(event.end);
    return key >= eventStartDay && key <= eventEndDay;
  }
  return now >= start && now < end;
}

/**
 * @param {import('./myDayTypes.js').MyDayEvent} event
 * @param {Date} asOf
 */
export function minutesUntilStart(event, asOf = new Date()) {
  if (event.allDay) return null;
  const start = new Date(event.start).getTime();
  const diff = Math.round((start - asOf.getTime()) / 60000);
  return diff > 0 ? diff : null;
}

/**
 * @param {import('./myDayTypes.js').MyDayEvent[]} events
 * @param {Date} asOf
 */
export function sortEventsForDay(events, _asOf = new Date()) {
  return [...events].sort((left, right) => {
    if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
    return left.start.localeCompare(right.start);
  });
}

/**
 * @param {import('./myDayTypes.js').MyDayEvent[]} events
 * @param {Date} asOf
 */
export function groupEventsByLocalDate(events, asOf = new Date()) {
  /** @type {Map<string, import('./myDayTypes.js').MyDayEvent[]>} */
  const map = new Map();
  for (const event of events) {
    const key = event.allDay ? localDateKeyFromIso(event.start) : localDateKeyFromIso(event.start);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(event);
  }
  for (const [key, list] of map) {
    map.set(key, sortEventsForDay(list, asOf));
  }
  return map;
}

/**
 * @param {import('./myDayTypes.js').MyDayCalendarPayload | null} payload
 * @param {Date} asOf
 */
export function buildHomeCardSummary(payload, asOf = new Date()) {
  if (!payload?.events?.length) {
    return { title: 'My Day', subtitle: 'No plans for the next few days' };
  }

  const todayKey = localDateKeyFromIso(asOf.toISOString());
  const todayEvents = payload.events.filter(
    (event) => localDateKeyFromIso(event.start) === todayKey || isEventHappeningNow(event, asOf)
  );
  const upcomingToday = sortEventsForDay(todayEvents, asOf).filter((event) => {
    if (isEventHappeningNow(event, asOf)) return true;
    if (event.allDay) return true;
    return new Date(event.end).getTime() > asOf.getTime();
  });

  if (upcomingToday.length === 0) {
    const tomorrowDate = new Date(asOf);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowKey = localDateKeyFromIso(tomorrowDate.toISOString());
    const tomorrowEvent = payload.events.find((event) => localDateKeyFromIso(event.start) === tomorrowKey);
    if (tomorrowEvent) {
      const when = tomorrowEvent.allDay
        ? 'All day'
        : formatTimeLabel(tomorrowEvent.start);
      return {
        title: 'My Day',
        subtitle: `Next event tomorrow at ${when}\n${tomorrowEvent.title}`
      };
    }
    return { title: 'My Day', subtitle: 'Nothing else today' };
  }

  if (upcomingToday.length === 1) {
    const event = upcomingToday[0];
    const when = event.allDay ? 'All day' : formatTimeLabel(event.start);
    const minutes = minutesUntilStart(event, asOf);
    const suffix =
      minutes != null && minutes <= 120 ? `In ${minutes} minutes` : when;
    return {
      title: 'My Day',
      subtitle: `Next\n${when}\n${event.title}\n${suffix}`
    };
  }

  const next = upcomingToday.find((event) => !isEventHappeningNow(event, asOf)) ?? upcomingToday[0];
  const nextWhen = next.allDay ? 'All day' : formatTimeLabel(next.start);
  return {
    title: 'My Day',
    subtitle: `${upcomingToday.length} events today\nNext: ${next.title} at ${nextWhen}`
  };
}

/**
 * User-facing copy for calendar fetch failures (message holds Worker `code`, optional `:status`).
 * @param {string} [message]
 */
export function myDayUnavailableMessage(message) {
  if (message === 'API not configured') {
    return 'The dashboard API is not configured for this site. Set VITE_API_BASE_URL on Cloudflare Pages (Preview and Production), then redeploy.';
  }
  if (message === 'CALENDAR_NOT_CONFIGURED') {
    return 'The calendar feed is not configured on the Worker. Set APPLE_CALENDAR_ICS_URL with wrangler, then try your PIN again.';
  }
  if (message?.startsWith('CALENDAR_UPSTREAM')) {
    const status = message.split(':')[1];
    if (status === '0') {
      return 'Could not reach Apple’s calendar servers from the Worker. Try again shortly, or check the published URL is HTTPS/webcal.';
    }
    if (status === '403' || status === '401') {
      return 'Apple rejected the published calendar link (HTTP ' + status + '). Create a new private published URL in Apple Calendar and update the Worker secret.';
    }
    if (status === '404') {
      return 'Apple could not find that calendar feed (HTTP 404). Check APPLE_CALENDAR_ICS_URL — use the full private published URL.';
    }
    if (status) {
      return 'Could not download your calendar from Apple (HTTP ' + status + '). Check the published link or try again shortly.';
    }
    return 'Could not download your calendar from Apple. Check the published link and Worker secret.';
  }
  if (message === 'CALENDAR_PARSE') {
    return 'Your calendar feed was retrieved but could not be read. Check Worker logs or try republishing the Apple calendar link.';
  }
  return 'My Day is temporarily unavailable. Unlock with your owner PIN again after confirming the Worker is deployed with APPLE_CALENDAR_ICS_URL.';
}
