import { localIsoDate } from '../sitterWelcomeCopy.js';

/**
 * @typedef {import('../../api/sitterStaysApi.js').SitterStayPayload} SitterStayPayload
 */

/**
 * @param {SitterStayPayload[] | null | undefined} stays
 * @param {Date} [referenceDate]
 * @returns {SitterStayPayload | null}
 */
export function getNextArrivalPrepStay(stays, referenceDate = new Date()) {
  if (!Array.isArray(stays) || stays.length === 0) return null;
  const today = localIsoDate(referenceDate);
  const candidates = stays.filter(
    (stay) =>
      stay.status !== 'cancelled' &&
      stay.status !== 'completed' &&
      String(stay.sitEnd ?? '').trim() >= today
  );
  candidates.sort((left, right) => String(left.sitStart).localeCompare(String(right.sitStart)));
  return candidates[0] ?? null;
}

/**
 * @param {SitterStayPayload} stay
 * @param {(isoDate: string) => string} [formatDate]
 */
export function formatArrivalPrepStayLabel(stay, formatDate = (value) => value) {
  const label = String(stay.label ?? '').trim();
  const start = formatDate(stay.sitStart);
  const end = formatDate(stay.sitEnd);
  const dates = start === end ? start : `${start} – ${end}`;
  return label ? `${label} (${dates})` : dates;
}
