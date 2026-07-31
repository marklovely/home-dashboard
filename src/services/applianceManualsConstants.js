/** @readonly */
export const APPLIANCE_MANUAL_CATEGORIES = Object.freeze([
  'Kitchen',
  'Laundry',
  'Heating',
  'TV & Entertainment',
  'Cleaning',
  'Garden',
  'Other'
]);

export const APPLIANCE_MANUALS_CATEGORY_ID = 'appliance-manuals';

export const MAX_APPLIANCE_MANUAL_PDF_BYTES = 15 * 1024 * 1024;

/**
 * @param {number} bytes
 */
export function formatApplianceManualFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @param {string} iso
 */
export function formatApplianceManualDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
