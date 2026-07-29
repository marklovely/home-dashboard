/**
 * @typedef {Object} NormalizedCalendarEvent
 * @property {string} id
 * @property {string} title
 * @property {string} start ISO-8601 with offset
 * @property {string} end ISO-8601 with offset
 * @property {boolean} allDay
 * @property {string | null} location
 * @property {'confirmed' | 'cancelled'} status
 */

/**
 * @typedef {Object} CalendarApiResponse
 * @property {string} generatedAt
 * @property {string} timezone
 * @property {{ from: string, to: string }} range
 * @property {NormalizedCalendarEvent[]} events
 * @property {boolean} stale
 * @property {string} lastUpdated
 */

export {};
