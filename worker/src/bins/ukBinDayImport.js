import { isUsableUkBinDayCouncilId } from './ukBinDay.js';

export { isUsableUkBinDayCouncilId };

/**
 * @param {string} token
 */
function parseBinTypeToken(token) {
  const value = String(token ?? '').trim().toLowerCase();
  if (!value) return 'unknown';
  if (/^(rubbish|general|waste|trash|black|green bin|refuse)/.test(value)) return 'rubbish';
  if (/^(recycl|glass|blue|grey|gray)/.test(value)) return 'recycling';
  if (/^(garden|green waste|brown|compost|yard)/.test(value)) return 'gardenWaste';
  return 'unknown';
}

/**
 * @param {Array<{ date?: string, type?: string }>} collections
 */
export function mapUkBinDayCollections(collections) {
  /** @type {Map<string, { date: string, type: 'rubbish' | 'recycling', bankHolidayChange: boolean }>} */
  const householdByKey = new Map();
  /** @type {Set<string>} */
  const gardenDates = new Set();

  for (const item of collections ?? []) {
    const date = String(item?.date ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const mapped = parseBinTypeToken(String(item?.type ?? ''));
    if (mapped === 'gardenWaste') {
      gardenDates.add(date);
      continue;
    }

    const type = mapped === 'recycling' ? 'recycling' : 'rubbish';
    const key = `${date}:${type}`;
    if (!householdByKey.has(key)) {
      householdByKey.set(key, { date, type, bankHolidayChange: false });
    }
  }

  const household = [...householdByKey.values()].sort((a, b) => a.date.localeCompare(b.date));
  const gardenWaste = [...gardenDates]
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({ date }));

  return { household, gardenWaste };
}

/**
 * @param {{
 *   uprn: string,
 *   councilId: string,
 *   postcode?: string,
 *   address?: string
 * }} params
 * @param {typeof fetch} fetchImpl
 */
export async function fetchUkBinDaySchedule(params, fetchImpl = fetch) {
  const uprn = String(params.uprn ?? '').trim();
  const councilId = String(params.councilId ?? '').trim();
  if (!uprn || !councilId) {
    return { ok: false, status: 400, error: 'UPRN and council are required.' };
  }
  if (!isUsableUkBinDayCouncilId(councilId)) {
    return { ok: false, status: 422, error: 'Automatic import is not available for this council.' };
  }

  const url = new URL(`https://ukbinday.co.uk/api/v1/lookup/${encodeURIComponent(uprn)}`);
  url.searchParams.set('council', councilId);
  const postcode = String(params.postcode ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (postcode) url.searchParams.set('postcode', postcode);
  const address = String(params.address ?? '').trim();
  if (address) url.searchParams.set('address', address);

  const response = await fetchImpl(url.toString(), {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status === 404 ? 404 : 503,
      error: 'Could not fetch collection dates from the council service.'
    };
  }

  const body = await response.json();
  const detail = String(body?.detail ?? '').trim();
  const collections = Array.isArray(body?.collections) ? body.collections : [];
  const mapped = mapUkBinDayCollections(collections);
  const count = mapped.household.length + mapped.gardenWaste.length;
  if (!count) {
    return {
      ok: false,
      status: 422,
      error: detail
        ? `${detail} Try PDF upload or paste instead.`
        : 'No collection dates were returned — try PDF upload or paste instead.'
    };
  }

  return {
    ok: true,
    cached: Boolean(body?.cached),
    household: mapped.household,
    gardenWaste: mapped.gardenWaste,
    count
  };
}
