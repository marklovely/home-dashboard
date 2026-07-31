import { APPLIANCE_MANUAL_CATEGORIES } from './constants.js';

/** @type {Record<string, number>} */
const LIMITS = {
  title: 200,
  applianceName: 200,
  manufacturer: 120,
  model: 120,
  category: 64,
  location: 200,
  description: 2000,
  originalFilename: 255
};

/**
 * @param {unknown} value
 * @param {number} maxLen
 * @returns {string | null}
 */
export function sanitizeOptionalText(value, maxLen) {
  if (value == null || value === '') return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.slice(0, maxLen);
}

/**
 * @param {unknown} value
 * @param {keyof typeof LIMITS} field
 * @returns {{ ok: true, value: string } | { ok: false, message: string }}
 */
export function sanitizeRequiredText(value, field) {
  const maxLen = LIMITS[field] ?? 200;
  const text = sanitizeOptionalText(value, maxLen);
  if (!text) {
    return { ok: false, message: 'This field is required.' };
  }
  return { ok: true, value: text };
}

/**
 * @param {unknown} value
 * @returns {{ ok: true, value: string } | { ok: false, message: string }}
 */
export function sanitizeCategory(value) {
  const category = sanitizeOptionalText(value, LIMITS.category);
  if (!category) {
    return { ok: false, message: 'Please choose a category.' };
  }
  if (!APPLIANCE_MANUAL_CATEGORIES.includes(category)) {
    return { ok: false, message: 'Please choose a valid category.' };
  }
  return { ok: true, value: category };
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function parsePublishedFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value ?? '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'on';
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseSortOrder(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(9999, Math.trunc(num)));
}

/**
 * @param {string} filename
 */
export function sanitizeOriginalFilename(filename) {
  const base = String(filename ?? 'manual.pdf')
    .split(/[/\\]/)
    .pop()
    ?.replace(/[^\w.\- ()]/g, '_')
    .trim();
  const safe = base && base.length > 0 ? base : 'manual.pdf';
  return safe.slice(0, LIMITS.originalFilename);
}
