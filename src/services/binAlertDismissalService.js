const STORAGE_KEY = 'home-dashboard-bin-alert-dismissed';

/** @type {Set<() => void>} */
const listeners = new Set();

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

/** @returns {string | null} */
export function getDismissedBinCollectionDate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const collectionDate = typeof parsed?.collectionDate === 'string' ? parsed.collectionDate : null;
    if (!collectionDate) return null;

    const dismissedDay = startOfLocalDay(parseLocalDate(collectionDate));
    const today = startOfLocalDay(new Date());
    if (dismissedDay.getTime() < today.getTime()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return collectionDate;
  } catch {
    return null;
  }
}

/**
 * @param {string} collectionDateIso
 */
export function dismissBinAlertForCollection(collectionDateIso) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ collectionDate: collectionDateIso }));
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

/** @internal */
export function resetBinAlertDismissalForTests() {
  localStorage.removeItem(STORAGE_KEY);
  listeners.clear();
}
