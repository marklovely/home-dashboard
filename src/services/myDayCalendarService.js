import { fetchMyDayCalendar } from '../api/calendarApi.js';
import { getOwnerAccessToken } from '../auth/ownerAccessToken.js';
import { isHouseSitterExperience, subscribeToUserMode } from '../auth/userMode.js';
import { buildHomeCardSummary } from './myDayFormat.js';

export const MY_DAY_REFRESH_MS = 5 * 60 * 1000;

/** @typedef {'idle' | 'loading' | 'ready' | 'unauthorized' | 'unavailable'} MyDayStatus */

/** @typedef {{ status: MyDayStatus, data: import('./myDayTypes.js').MyDayCalendarPayload | null, message: string }} MyDayState */

/** @type {MyDayState} */
let state = {
  status: 'idle',
  data: null,
  message: ''
};

/** @type {Set<(state: MyDayState) => void>} */
const listeners = new Set();

/** @type {Promise<MyDayState> | null} */
let inFlight = null;

/** @type {number} */
let lastFetchedAt = 0;

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function clearMyDayCalendarState() {
  state = { status: 'idle', data: null, message: '' };
  lastFetchedAt = 0;
  inFlight = null;
  notify();
}

export function canFetchMyDayCalendar() {
  return !isHouseSitterExperience() && Boolean(getOwnerAccessToken());
}

export function getMyDayState() {
  return state;
}

/**
 * @param {(state: MyDayState) => void} listener
 */
export function subscribeToMyDayCalendar(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/**
 * @param {typeof fetch} [fetchImpl]
 * @param {{ force?: boolean }} [options]
 */
export async function refreshMyDayCalendar(fetchImpl = fetch, options = {}) {
  if (isHouseSitterExperience()) {
    clearMyDayCalendarState();
    return state;
  }

  if (!getOwnerAccessToken()) {
    state = { status: 'unauthorized', data: null, message: 'Owner PIN required' };
    notify();
    return state;
  }

  if (
    !options.force &&
    state.data &&
    Date.now() - lastFetchedAt < MY_DAY_REFRESH_MS &&
    state.status === 'ready'
  ) {
    return state;
  }

  if (inFlight) return inFlight;

  state = { ...state, status: 'loading' };
  notify();

  inFlight = (async () => {
    const result = await fetchMyDayCalendar({ fetchImpl });
    if (result.ok && result.data) {
      state = {
        status: 'ready',
        data: result.data,
        message: result.data.stale ? 'stale' : ''
      };
      lastFetchedAt = Date.now();
    } else if (result.status === 401) {
      state = { status: 'unauthorized', data: null, message: 'Owner PIN required' };
    } else if (state.data) {
      state = { status: 'ready', data: state.data, message: 'stale' };
    } else {
      state = { status: 'unavailable', data: null, message: result.message };
    }
    notify();
    inFlight = null;
    return state;
  })();

  return inFlight;
}

/**
 * @param {Date} [asOf]
 */
export function getMyDayHomeSummary(asOf = new Date()) {
  if (isHouseSitterExperience()) {
    return { title: 'My Day', subtitle: '' };
  }
  if (state.status === 'unauthorized') {
    return { title: 'My Day', subtitle: 'Owner PIN required' };
  }
  if (state.status === 'loading' && !state.data) {
    return { title: 'My Day', subtitle: 'Loading…' };
  }
  if (state.status === 'unavailable' && !state.data) {
    const subtitle =
      state.message === 'API not configured'
        ? 'API URL not configured'
        : 'Temporarily unavailable';
    return { title: 'My Day', subtitle };
  }
  const summary = buildHomeCardSummary(state.data, asOf);
  return {
    title: summary.title,
    subtitle: summary.subtitle.replace(/\n/g, ' · ')
  };
}

/** @type {ReturnType<typeof setInterval> | null} */
let visibilityHookInstalled = false;

export function ensureMyDayCalendarLifecycle() {
  subscribeToUserMode(() => {
    if (isHouseSitterExperience()) {
      clearMyDayCalendarState();
    }
  });

  if (visibilityHookInstalled || typeof document === 'undefined') return;
  visibilityHookInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!canFetchMyDayCalendar()) return;
    if (Date.now() - lastFetchedAt > MY_DAY_REFRESH_MS) {
      void refreshMyDayCalendar();
    }
  });
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export function startMyDayCalendarService(fetchImpl = fetch) {
  ensureMyDayCalendarLifecycle();
  if (!canFetchMyDayCalendar()) return;
  void refreshMyDayCalendar(fetchImpl);
}
