/**
 * Parse bulk-pasted bin collection dates (one per line).
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UK_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;

/** @typedef {'rubbish' | 'recycling' | 'gardenWaste' | 'unknown'} ParsedBinType */

/**
 * @param {string} token
 * @returns {ParsedBinType}
 */
export function parseBinTypeToken(token) {
  const value = String(token ?? '').trim().toLowerCase();
  if (!value) return 'unknown';
  if (/^(rubbish|general|waste|trash|black|green bin|refuse)/.test(value)) return 'rubbish';
  if (/^(recycl|glass|blue|grey|gray)/.test(value)) return 'recycling';
  if (/^(garden|green waste|brown|compost|yard)/.test(value)) return 'gardenWaste';
  return 'unknown';
}

/**
 * @param {string} raw
 * @returns {string}
 */
function parseDateToken(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';

  const iso = value.match(ISO_DATE);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const uk = value.match(UK_DATE);
  if (uk) {
    const day = String(uk[1]).padStart(2, '0');
    const month = String(uk[2]).padStart(2, '0');
    let year = Number(uk[3]);
    if (year < 100) year += 2000;
    return `${year}-${month}-${day}`;
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * @param {string} line
 * @returns {{ date: string, type: ParsedBinType, raw: string }}
 */
export function parseBinScheduleLine(line) {
  const raw = String(line ?? '').trim();
  if (!raw || raw.startsWith('#')) {
    return { date: '', type: 'unknown', raw };
  }

  const parts = raw.split(/[\t,|]+|\s+/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    return { date: '', type: 'unknown', raw };
  }

  let date = '';
  let type = /** @type {ParsedBinType} */ ('unknown');

  for (const part of parts) {
    const maybeDate = parseDateToken(part);
    if (maybeDate && !date) {
      date = maybeDate;
      continue;
    }
    const maybeType = parseBinTypeToken(part);
    if (maybeType !== 'unknown') type = maybeType;
  }

  if (!date) {
    date = parseDateToken(raw.replace(/[^\d/.-]/g, ' ').trim());
  }
  if (type === 'unknown') {
    type = parseBinTypeToken(raw);
  }

  return { date, type, raw };
}

/**
 * @param {string} text
 * @returns {{ entries: { date: string, type: ParsedBinType, raw: string }[], validCount: number, unknownCount: number }}
 */
export function parseBinSchedulePaste(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  /** @type {{ date: string, type: ParsedBinType, raw: string }[]} */
  const entries = [];
  let validCount = 0;
  let unknownCount = 0;

  for (const line of lines) {
    const parsed = parseBinScheduleLine(line);
    if (!parsed.raw || parsed.raw.startsWith('#')) continue;
    entries.push(parsed);
    if (parsed.date && parsed.type !== 'unknown') validCount += 1;
    else unknownCount += 1;
  }

  return { entries, validCount, unknownCount };
}

/**
 * @param {{ date: string, type: ParsedBinType }[]} parsed
 * @param {ParsedBinType} fallbackType
 * @returns {{ household: import('./binScheduleProfile.js').BinScheduleHouseholdEntry[], gardenWaste: import('./binScheduleProfile.js').BinScheduleGardenEntry[] }}
 */
export function binScheduleEntriesFromParsed(parsed, fallbackType = 'rubbish') {
  /** @type {import('./binScheduleProfile.js').BinScheduleHouseholdEntry[]} */
  const household = [];
  /** @type {import('./binScheduleProfile.js').BinScheduleGardenEntry[]} */
  const gardenWaste = [];

  for (const row of parsed) {
    if (!row.date) continue;
    const type = row.type === 'unknown' ? fallbackType : row.type;
    if (type === 'gardenWaste') {
      gardenWaste.push({ date: row.date });
    } else if (type === 'rubbish' || type === 'recycling') {
      household.push({ date: row.date, type, bankHolidayChange: false });
    }
  }

  household.sort((a, b) => a.date.localeCompare(b.date));
  gardenWaste.sort((a, b) => a.date.localeCompare(b.date));
  return { household, gardenWaste };
}
