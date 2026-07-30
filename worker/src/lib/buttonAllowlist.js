/**
 * Server-side allowlist — VB suffix matches Virtual Buttons numeric ID in the dashboard config.
 * VB08 = Master Bedroom Lights On, VB09 = Restore Lights After Movie, VB10 = Master Bedroom Lights Off (never renumber).
 */
export const ALLOWED_BUTTON_CODES = Object.freeze([
  'VB01',
  'VB02',
  'VB03',
  'VB04',
  'VB05',
  'VB06',
  'VB07',
  'VB08',
  'VB09',
  'VB10'
]);

/** @type {Record<string, number>} */
export const BUTTON_CODE_TO_VIRTUAL_ID = Object.freeze(
  Object.fromEntries(
    ALLOWED_BUTTON_CODES.map((code) => {
      const numeric = Number.parseInt(code.slice(2), 10);
      return [code, numeric];
    })
  )
);

/**
 * @param {string} raw
 * @returns {string | null}
 */
export function normalizeButtonCode(raw) {
  const trimmed = raw.trim().toUpperCase();
  if (/^VB\d{1,2}$/.test(trimmed)) {
    const num = Number.parseInt(trimmed.slice(2), 10);
    if (num >= 1 && num <= 99) {
      return `VB${String(num).padStart(2, '0')}`;
    }
  }
  return null;
}

/**
 * @param {string} code
 */
export function isAllowedButtonCode(code) {
  return ALLOWED_BUTTON_CODES.includes(code);
}
