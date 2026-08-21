const STORAGE_KEY = 'home-dashboard-bin-alert-dismissed';

/** @type {Set<() => void>} */
const listeners = new Set();

/** @type {string | null} */
let memoryDismissedCollectionDate = null;

/**
 * @param {string} isoDate
 * @returns {Date}
 */
function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * @param {Date} date
 */
function startOfLocalDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @param {string | null} collectionDate
 */
function writeDismissedCollectionDate(collectionDate) {
  memoryDismissedCollectionDate = collectionDate;
  try {
    if (!collectionDate) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ collectionDate }));
  } catch {
    // Keep in-memory fallback when storage is unavailable (kiosk / private mode).
  }
}

/** @returns {string | null} */
export function getDismissedBinCollectionDate() {
  /** @type {string | null} */
  let collectionDate = memoryDismissedCollectionDate;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      collectionDate =
        typeof parsed?.collectionDate === 'string' ? parsed.collectionDate : collectionDate;
    }
  } catch {
    // Fall back to memory only.
  }

  if (!collectionDate) return null;

  const collectionDay = startOfLocalDay(parseLocalDate(collectionDate));
  const today = startOfLocalDay(new Date());
  if (today.getTime() > collectionDay.getTime()) {
    writeDismissedCollectionDate(null);
    return null;
  }

  memoryDismissedCollectionDate = collectionDate;
  return collectionDate;
}

/**
 * @param {string} collectionDateIso
 */
export function dismissBinAlertForCollection(collectionDateIso) {
  writeDismissedCollectionDate(collectionDateIso);
  notify();
}

/**
 * @param {string} collectionDateIso
 */
export function isBinAlertDismissed(collectionDateIso) {
  return getDismissedBinCollectionDate() === collectionDateIso;
}

/** @param {() => void} listener */
export function subscribeToBinAlertDismissal(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Clears an active "Bins are out" dismissal so home reminders can show again. */
export function clearBinAlertDismissal() {
  writeDismissedCollectionDate(null);
  notify();
}

/** @internal */
export function resetBinAlertDismissalForTests() {
  clearBinAlertDismissal();
  listeners.clear();
}
