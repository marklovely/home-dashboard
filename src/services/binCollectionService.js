/** @typedef {'recycling' | 'general-waste'} BinStream */

/**
 * @param {Date} date
 */
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * @param {Date} from
 * @param {number} weekday 0=Sun … 6=Sat
 */
function daysUntilWeekday(from, weekday) {
  const day = startOfDay(from);
  const current = day.getDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0) delta = 0;
  return delta;
}

/**
 * @param {Date} date
 */
function isoWeekNumber(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * @param {Date} from
 * @param {BinStream} stream
 */
function nextCollectionDate(from, stream) {
  const day = startOfDay(from);
  const thursday = 4;
  let candidate = new Date(day);
  candidate.setDate(candidate.getDate() + daysUntilWeekday(day, thursday));
  if (stream === 'recycling') {
    return candidate;
  }
  const isGeneralWeek = isoWeekNumber(candidate) % 2 === 0;
  if (!isGeneralWeek) {
    candidate.setDate(candidate.getDate() + 7);
  }
  if (candidate < day) {
    candidate.setDate(candidate.getDate() + 14);
  }
  return candidate;
}

/**
 * @param {Date} from
 * @param {Date} collectionDate
 */
function formatRelativeCollection(from, collectionDate) {
  const start = startOfDay(from);
  const target = startOfDay(collectionDate);
  const diffDays = Math.round((target - start) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days`;
  return target.toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * @param {Date} [referenceDate]
 */
export function getUpcomingBinCollection(referenceDate = new Date()) {
  const day = startOfDay(referenceDate);
  const options = [
    {
      stream: /** @type {BinStream} */ ('recycling'),
      label: 'Recycling',
      emoji: '♻',
      date: nextCollectionDate(day, 'recycling')
    },
    {
      stream: /** @type {BinStream} */ ('general-waste'),
      label: 'General Waste',
      emoji: '⚫',
      date: nextCollectionDate(day, 'general-waste')
    }
  ];
  options.sort((left, right) => left.date - right.date);
  const next = options[0];
  return {
    ...next,
    relative: formatRelativeCollection(day, next.date)
  };
}

/**
 * @param {Date} [referenceDate]
 * @returns {import('../types/app.js').AppSummary}
 */
export function getBinCollectionSummary(referenceDate = new Date()) {
  const next = getUpcomingBinCollection(referenceDate);
  return {
    title: `${next.emoji} ${next.label}`,
    subtitle: next.relative
  };
}
