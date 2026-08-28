/**
 * @param {string} sitStart YYYY-MM-DD
 * @param {string} currentSitEnd YYYY-MM-DD
 * @param {string} nextSitEnd YYYY-MM-DD
 * @returns {string | null}
 */
export function validateExtendStayEndDate(sitStart, currentSitEnd, nextSitEnd) {
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const value = String(nextSitEnd ?? '').trim();

  if (!value) return 'Choose a new end date.';
  if (!ISO_DATE_RE.test(value)) return 'Use a valid end date.';
  if (value < sitStart) return 'End date must be on or after the sit start date.';
  if (value <= currentSitEnd) return 'Choose a date after the current end date to extend the stay.';
  return null;
}
