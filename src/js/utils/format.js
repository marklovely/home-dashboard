import { getClockFormat } from '../../services/displayPreferencesService.js';

export function getGreeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatDate(date, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
}

/**
 * @param {Date} date
 * @param {string} [locale]
 * @param {{ hour12?: boolean }} [options]
 */
export function formatTime(date, locale = 'en-GB', options = {}) {
  const hour12 = options.hour12 ?? getClockFormat() === '12';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12
  }).format(date);
}
