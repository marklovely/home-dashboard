import { validateEmailAddresses } from './contactValidation.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {string | undefined} raw
 * @returns {string[]}
 */
export function parseSitterStayEmails(raw) {
  return String(raw ?? '')
    .split(/[,;\n]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {{ emails?: string, sitStart?: string, sitEnd?: string }} values
 * @returns {{ ok: true } | { ok: false, fieldErrors: Record<string, string> }}
 */
export function validateSitterStayForm(values) {
  /** @type {Record<string, string>} */
  const fieldErrors = {};

  const emails = parseSitterStayEmails(values.emails);
  if (emails.length === 0) {
    fieldErrors.emails = 'Enter at least one sitter email.';
  } else {
    const emailError = validateEmailAddresses(emails);
    if (emailError) fieldErrors.emails = emailError;
  }

  const sitStart = String(values.sitStart ?? '').trim();
  const sitEnd = String(values.sitEnd ?? '').trim();

  if (!sitStart) {
    fieldErrors.sitStart = 'Choose a start date.';
  } else if (!ISO_DATE_RE.test(sitStart)) {
    fieldErrors.sitStart = 'Use a valid start date.';
  }

  if (!sitEnd) {
    fieldErrors.sitEnd = 'Choose an end date.';
  } else if (!ISO_DATE_RE.test(sitEnd)) {
    fieldErrors.sitEnd = 'Use a valid end date.';
  }

  if (!fieldErrors.sitStart && !fieldErrors.sitEnd && sitEnd < sitStart) {
    fieldErrors.sitEnd = 'End date must be on or after the start date.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true };
}

export const SITTER_STAY_FORM_SUMMARY_ERROR = 'Missing entries — check the fields highlighted above.';

/**
 * Align end-date picker with start date: set min and default value so native
 * calendars open in the same month (e.g. start 4 May 2027 → end picker in May 2027).
 *
 * @param {HTMLInputElement} startInput
 * @param {HTMLInputElement} endInput
 */
export function syncSitterStayEndDateWithStart(startInput, endInput) {
  const start = startInput.value.trim();
  if (!start) {
    endInput.removeAttribute('min');
    return;
  }

  endInput.min = start;
  const end = endInput.value.trim();
  if (!end || end < start) {
    endInput.value = start;
  }
}

/**
 * When end is empty but start is set, seed end so the picker opens on the start month.
 *
 * @param {HTMLInputElement} startInput
 * @param {HTMLInputElement} endInput
 */
export function prepareSitterStayEndDatePicker(startInput, endInput) {
  const start = startInput.value.trim();
  if (start && !endInput.value.trim()) {
    endInput.min = start;
    endInput.value = start;
  }
}

