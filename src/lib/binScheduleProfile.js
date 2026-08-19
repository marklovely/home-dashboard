/**
 * Owner-configured bin collection schedule (stored in site_profile.binSchedule).
 */

/** @typedef {'rubbish' | 'recycling'} HouseholdBinType */

/**
 * @typedef {Object} BinScheduleHouseholdEntry
 * @property {string} date YYYY-MM-DD
 * @property {HouseholdBinType} type
 * @property {boolean} [bankHolidayChange]
 */

/**
 * @typedef {Object} BinScheduleGardenEntry
 * @property {string} date YYYY-MM-DD
 */

/**
 * @typedef {Object} BinScheduleProfile
 * @property {string} collectionLocation
 * @property {string} councilUrl
 * @property {string} validFrom YYYY-MM-DD
 * @property {string} validUntil YYYY-MM-DD
 * @property {string} normalCollectionDay e.g. Friday
 * @property {BinScheduleHouseholdEntry[]} household
 * @property {BinScheduleGardenEntry[]} gardenWaste
 * @property {number} alertHoursBefore Hours before collection day (from 6am) to show sitter reminders; 0 disables
 */

export const DEFAULT_BIN_ALERT_HOURS_BEFORE = 24;
export const MIN_BIN_ALERT_HOURS_BEFORE = 0;
export const MAX_BIN_ALERT_HOURS_BEFORE = 168;

export const BIN_ALERT_HOURS_OPTIONS = [
  { value: '0', label: 'Off' },
  { value: '12', label: '12 hours before' },
  { value: '24', label: '24 hours before (default)' },
  { value: '48', label: '48 hours before' },
  { value: '72', label: '72 hours before' }
];

export const DEFAULT_BIN_SCHEDULE = /** @type {BinScheduleProfile} */ ({
  collectionLocation: '',
  councilUrl: '',
  validFrom: '',
  validUntil: '',
  normalCollectionDay: '',
  household: [],
  gardenWaste: [],
  alertHoursBefore: DEFAULT_BIN_ALERT_HOURS_BEFORE
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {unknown} value
 * @returns {BinScheduleProfile}
 */
export function normalizeBinSchedule(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_BIN_SCHEDULE };
  }

  /** @type {Record<string, unknown>} */
  const raw = value;

  /** @type {BinScheduleHouseholdEntry[]} */
  const household = [];
  if (Array.isArray(raw.household)) {
    for (const entry of raw.household) {
      if (!entry || typeof entry !== 'object') continue;
      const date = String(entry.date ?? '').trim();
      const type = entry.type === 'recycling' ? 'recycling' : entry.type === 'rubbish' ? 'rubbish' : null;
      if (!ISO_DATE.test(date) || !type) continue;
      household.push({
        date,
        type,
        bankHolidayChange: Boolean(entry.bankHolidayChange)
      });
    }
  }

  /** @type {BinScheduleGardenEntry[]} */
  const gardenWaste = [];
  if (Array.isArray(raw.gardenWaste)) {
    for (const entry of raw.gardenWaste) {
      if (!entry || typeof entry !== 'object') continue;
      const date = String(entry.date ?? '').trim();
      if (!ISO_DATE.test(date)) continue;
      gardenWaste.push({ date });
    }
  }

  household.sort((a, b) => a.date.localeCompare(b.date));
  gardenWaste.sort((a, b) => a.date.localeCompare(b.date));

  const alertRaw = raw.alertHoursBefore;
  const alertParsed = Number(alertRaw);
  const alertHoursBefore =
    alertRaw === undefined || alertRaw === null || alertRaw === ''
      ? DEFAULT_BIN_ALERT_HOURS_BEFORE
      : Math.min(
          MAX_BIN_ALERT_HOURS_BEFORE,
          Math.max(MIN_BIN_ALERT_HOURS_BEFORE, Math.round(alertParsed))
        );

  return {
    collectionLocation: String(raw.collectionLocation ?? '').trim(),
    councilUrl: String(raw.councilUrl ?? '').trim(),
    validFrom: String(raw.validFrom ?? '').trim(),
    validUntil: String(raw.validUntil ?? '').trim(),
    normalCollectionDay: String(raw.normalCollectionDay ?? '').trim(),
    household,
    gardenWaste,
    alertHoursBefore: Number.isFinite(alertParsed) ? alertHoursBefore : DEFAULT_BIN_ALERT_HOURS_BEFORE
  };
}

/**
 * @param {BinScheduleProfile | unknown} [schedule]
 */
export function getBinAlertHoursBefore(schedule) {
  const normalized = normalizeBinSchedule(schedule);
  return normalized.alertHoursBefore ?? DEFAULT_BIN_ALERT_HOURS_BEFORE;
}

/**
 * @param {unknown} profile
 * @returns {BinScheduleProfile}
 */
export function readBinScheduleFromProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return { ...DEFAULT_BIN_SCHEDULE };
  }
  return normalizeBinSchedule(/** @type {Record<string, unknown>} */ (profile).binSchedule);
}

/**
 * @param {BinScheduleProfile} schedule
 */
export function hasConfiguredBinSchedule(schedule) {
  return schedule.household.length > 0 || schedule.gardenWaste.length > 0;
}

/**
 * @param {BinScheduleProfile} schedule
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateBinSchedule(schedule) {
  if (!hasConfiguredBinSchedule(schedule)) {
    return { ok: true };
  }

  for (const entry of schedule.household) {
    if (!ISO_DATE.test(entry.date)) {
      return { ok: false, message: 'Each bin date must use YYYY-MM-DD format.' };
    }
  }
  for (const entry of schedule.gardenWaste) {
    if (!ISO_DATE.test(entry.date)) {
      return { ok: false, message: 'Each garden waste date must use YYYY-MM-DD format.' };
    }
  }

  if (schedule.validFrom && !ISO_DATE.test(schedule.validFrom)) {
    return { ok: false, message: 'Valid from must be YYYY-MM-DD.' };
  }
  if (schedule.validUntil && !ISO_DATE.test(schedule.validUntil)) {
    return { ok: false, message: 'Valid until must be YYYY-MM-DD.' };
  }

  return { ok: true };
}

/**
 * Fill validFrom/validUntil from entries when blank.
 * @param {BinScheduleProfile} schedule
 */
export function inferBinSchedulePeriod(schedule) {
  const dates = [
    ...schedule.household.map((entry) => entry.date),
    ...schedule.gardenWaste.map((entry) => entry.date)
  ].sort();

  if (!dates.length) return schedule;

  return {
    ...schedule,
    validFrom: schedule.validFrom || dates[0],
    validUntil: schedule.validUntil || dates[dates.length - 1]
  };
}
