/**
 * @typedef {Object} MyDayEvent
 * @property {string} id
 * @property {string} title
 * @property {string} start
 * @property {string} end
 * @property {boolean} allDay
 * @property {string | null} location
 * @property {'confirmed' | 'cancelled'} status
 */

/**
 * @typedef {Object} MyDayCalendarPayload
 * @property {string} generatedAt
 * @property {string} timezone
 * @property {{ from: string, to: string }} range
 * @property {MyDayEvent[]} events
 * @property {boolean} stale
 * @property {string} lastUpdated
 */

export {};
