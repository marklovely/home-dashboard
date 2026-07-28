import { formatDate, formatTime, getGreeting } from '../utils/format.js';

export function updateClock(elements, now = new Date()) {
  elements.clock.textContent = formatTime(now);
  elements.seconds.textContent = String(now.getSeconds()).padStart(2, '0');
  elements.date.textContent = formatDate(now);
  elements.greeting.textContent = getGreeting(now.getHours());
}

export function startClock(elements, intervalMs = 1000) {
  updateClock(elements);
  return setInterval(() => updateClock(elements), intervalMs);
}
