import { defineApp } from '../../components/App/defineApp.js';
import { promptOwnerPinUnlock } from '../../auth/ownerAccessGesture.js';
import { isTestHubEnvironment } from '../../auth/hubEnvironment.js';
import { isHouseSitterMode } from '../../modes/modeConfig.js';
import {
  formatDayHeading,
  formatEventTimeRange,
  greetingForTime,
  groupEventsByLocalDate,
  isEventHappeningNow,
  localDateKeyFromIso,
  minutesUntilStart,
  myDayUnavailableMessage
} from '../../services/myDayFormat.js';
import {
  getMyDayHomeSummary,
  getMyDayState,
  refreshMyDayCalendar,
  subscribeToMyDayCalendar
} from '../../services/myDayCalendarService.js';
import {
  MY_DAY_NOT_CONFIGURED_INTRO,
  MY_DAY_TEST_INTRO,
  renderMyDaySetupGuide
} from './myDaySetupGuide.js';

/**
 * @param {HTMLElement} host
 * @param {import('../../services/myDayTypes.js').MyDayEvent} event
 * @param {Date} asOf
 */
function renderEventCard(host, event, asOf) {
  const card = document.createElement('article');
  card.className = 'my-day-event';

  const time = document.createElement('p');
  time.className = 'my-day-event-time';
  time.textContent = formatEventTimeRange(event);

  const title = document.createElement('p');
  title.className = 'my-day-event-title';
  title.textContent = event.title;

  card.append(time, title);

  if (isEventHappeningNow(event, asOf)) {
    const now = document.createElement('span');
    now.className = 'my-day-badge';
    now.textContent = 'Happening now';
    card.append(now);
  } else {
    const minutes = minutesUntilStart(event, asOf);
    if (minutes != null && minutes <= 120) {
      const soon = document.createElement('span');
      soon.className = 'my-day-badge my-day-badge--subtle';
      soon.textContent = `In ${minutes} minutes`;
      card.append(soon);
    }
  }

  if (event.location) {
    const location = document.createElement('p');
    location.className = 'my-day-event-location';
    location.textContent = event.location;
    card.append(location);
  }

  host.append(card);
}

/**
 * @param {HTMLElement} section
 * @param {string} heading
 * @param {import('../../services/myDayTypes.js').MyDayEvent[]} events
 * @param {Date} asOf
 */
function renderDaySection(section, heading, events, asOf) {
  if (!events.length) return;

  const title = document.createElement('h3');
  title.className = 'my-day-section-title';
  title.textContent = heading;
  section.append(title);

  const list = document.createElement('div');
  list.className = 'my-day-event-list';
  for (const event of events) {
    renderEventCard(list, event, asOf);
  }
  section.append(list);
}

/**
 * @param {HTMLElement} viewport
 */
function renderMyDayApp(viewport) {
  const asOf = new Date();
  const state = getMyDayState();
  viewport.replaceChildren();

  if (state.status === 'setup') {
    renderMyDaySetupGuide(
      viewport,
      isTestHubEnvironment() ? MY_DAY_TEST_INTRO : MY_DAY_NOT_CONFIGURED_INTRO
    );
    return;
  }

  const page = document.createElement('section');
  page.className = 'app-page my-day-app';
  page.setAttribute('aria-label', 'My Day');

  const greeting = document.createElement('p');
  greeting.className = 'my-day-greeting';
  greeting.textContent = greetingForTime(asOf);
  page.append(greeting);

  if (state.status === 'loading' && !state.data) {
    const loading = document.createElement('p');
    loading.className = 'my-day-status';
    loading.textContent = 'Loading your day…';
    page.append(loading);
    viewport.append(page);
    return;
  }

  if (state.status === 'unauthorized') {
    const message = document.createElement('p');
    message.className = 'my-day-status';
    message.textContent =
      'My Day uses your personal calendar. Enter your owner PIN once per session to load it.';
    page.append(message);

    const unlock = document.createElement('button');
    unlock.type = 'button';
    unlock.className = 'my-day-unlock-button';
    unlock.textContent = 'Enter owner PIN';
    unlock.addEventListener('click', () => {
      promptOwnerPinUnlock({
        onSuccess: () => {
          void refreshMyDayCalendar().finally(() => renderMyDayApp(viewport));
        }
      });
    });
    page.append(unlock);
    viewport.append(page);
    return;
  }

  if (state.status === 'unavailable' && !state.data) {
    if (state.message === 'CALENDAR_NOT_CONFIGURED') {
      renderMyDaySetupGuide(viewport, MY_DAY_NOT_CONFIGURED_INTRO);
      return;
    }
    const message = document.createElement('p');
    message.className = 'my-day-status';
    message.textContent = myDayUnavailableMessage(state.message);
    page.append(message);
    viewport.append(page);
    return;
  }

  if (state.message === 'stale' || state.data?.stale) {
    const stale = document.createElement('p');
    stale.className = 'my-day-stale-notice';
    const updated = state.data?.lastUpdated
      ? new Date(state.data.lastUpdated).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        })
      : '';
    stale.textContent = `Showing the latest available calendar information.${updated ? ` Last updated at ${updated}.` : ''}`;
    page.append(stale);
  }

  const payload = state.data;
  if (!payload?.events?.length) {
    const empty = document.createElement('p');
    empty.className = 'my-day-status';
    empty.textContent = 'No personal appointments in the next seven days.';
    page.append(empty);
    viewport.append(page);
    return;
  }

  const grouped = groupEventsByLocalDate(payload.events, asOf);
  const todayKey = localDateKeyFromIso(asOf.toISOString());
  const tomorrow = new Date(asOf);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKeyFromIso(tomorrow.toISOString());

  const todayEvents =
    grouped.get(todayKey)?.filter((event) => {
      if (isEventHappeningNow(event, asOf)) return true;
      if (event.allDay) return true;
      return new Date(event.end).getTime() > asOf.getTime();
    }) ?? [];

  renderDaySection(
    page,
    'Today',
    todayEvents,
    asOf
  );

  if (!todayEvents.length) {
    const todayEmpty = document.createElement('p');
    todayEmpty.className = 'my-day-empty-line';
    todayEmpty.textContent = 'Nothing planned for the rest of today.';
    page.append(todayEmpty);
  }

  const tomorrowEvents = grouped.get(tomorrowKey) ?? [];
  renderDaySection(page, 'Tomorrow', tomorrowEvents, asOf);
  if (!tomorrowEvents.length) {
    const tomorrowEmpty = document.createElement('p');
    tomorrowEmpty.className = 'my-day-empty-line';
    tomorrowEmpty.textContent = 'Nothing planned tomorrow.';
    page.append(tomorrowEmpty);
  }

  const later = document.createElement('div');
  later.className = 'my-day-later';
  const laterTitle = document.createElement('h3');
  laterTitle.className = 'my-day-section-title';
  laterTitle.textContent = 'Later this week';
  later.append(laterTitle);

  let laterDays = 0;
  for (const [dateKey, events] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (dateKey <= tomorrowKey) continue;
    laterDays += 1;
    renderDaySection(later, formatDayHeading(dateKey, asOf), events, asOf);
  }
  if (laterDays === 0) {
    const line = document.createElement('p');
    line.className = 'my-day-empty-line';
    line.textContent = 'Nothing else scheduled this week.';
    later.append(line);
  }
  page.append(later);

  viewport.append(page);
}

/**
 * @param {HTMLElement} viewport
 */
function mountMyDayApp(viewport) {
  if (isHouseSitterMode()) {
    viewport.replaceChildren();
    return;
  }

  void refreshMyDayCalendar().finally(() => {
    renderMyDayApp(viewport);
  });

  subscribeToMyDayCalendar(() => {
    renderMyDayApp(viewport);
  });
}

export const myDayApp = defineApp({
  id: 'my-day',
  title: 'My Day',
  iconId: 'calendar',
  description: 'Personal agenda for the week ahead',
  capabilities: ['schedule', 'owner-private'],
  accent: '#6f7b8f',
  profiles: ['owner'],
  summary: () => getMyDayHomeSummary(),
  mount: mountMyDayApp
});
