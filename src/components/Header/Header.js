import { startClock } from '../../js/modules/clock.js';

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.greeting
 * @param {HTMLElement} elements.date
 * @param {HTMLElement} elements.clock
 * @param {HTMLElement} elements.seconds
 */
export function initialiseHeader(elements) {
  startClock(elements);
}
