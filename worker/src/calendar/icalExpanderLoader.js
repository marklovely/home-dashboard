/** @typedef {typeof import('ical-expander').default} IcalExpanderCtor */

import icalExpanderImport from 'ical-expander';

/**
 * Wrangler sometimes bundles CJS `module.exports` so default import is not the constructor.
 * @returns {IcalExpanderCtor}
 */
export function getIcalExpanderConstructor() {
  /** @type {unknown} */
  let candidate = icalExpanderImport;
  if (candidate && typeof candidate === 'object' && 'default' in candidate) {
    candidate = /** @type {{ default?: unknown }} */ (candidate).default;
  }
  if (typeof candidate === 'function') {
    return /** @type {IcalExpanderCtor} */ (candidate);
  }
  const error = new Error('ICAL_EXPANDER_LOAD_FAILED');
  error.code = 'CALENDAR_RUNTIME';
  throw error;
}
