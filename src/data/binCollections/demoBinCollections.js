/**
 * Generic demo bin schedule for test environments — not tied to a real council or address.
 */

/** @param {Date} date */
function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** @param {Date} start */
function buildAlternatingFridays(start, count) {
  /** @type {import('./collectionTypes.js').HouseholdCollectionEntry[]} */
  const entries = [];
  const cursor = new Date(start);
  let type = /** @type {'rubbish' | 'recycling'} */ ('rubbish');
  for (let index = 0; index < count; index += 1) {
    entries.push({ date: formatIsoDate(cursor), type, bankHolidayChange: false });
    type = type === 'rubbish' ? 'recycling' : 'rubbish';
    cursor.setDate(cursor.getDate() + 7);
  }
  return entries;
}

export const demoHouseholdScheduleMeta = {
  validFrom: '2026-01-01',
  validUntil: '2026-12-31',
  source: 'Demo schedule',
  calendar: 'demo',
  normalCollectionDay: 'Friday',
  putOutBy: '7am',
  missedBinReportBy: 'contact your local council',
  maintenanceFiles: ['src/data/binCollections/demoBinCollections.js']
};

export const demoHouseholdCollections = buildAlternatingFridays(new Date(2026, 0, 2), 26);

export const demoGardenWasteScheduleMeta = {
  validFrom: '2026-01-01',
  validUntil: '2026-12-31',
  source: 'Demo schedule',
  round: 'demo',
  normalCollectionDay: 'Tuesday',
  maintenanceFiles: ['src/data/binCollections/demoBinCollections.js']
};

/** @type {import('./collectionTypes.js').GardenWasteCollectionEntry[]} */
export const demoGardenWasteCollections = [
  { date: '2026-01-06' },
  { date: '2026-01-20' },
  { date: '2026-02-03' },
  { date: '2026-02-17' },
  { date: '2026-03-03' },
  { date: '2026-03-17' }
];
