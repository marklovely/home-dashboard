/**
 * Optional enrichment from ukbinday.co.uk — bin scraper coverage for some councils.
 * @see https://ukbinday.co.uk/api-docs
 */

/** @type {Map<string, { id: string, name: string, url: string }> | null} */
let councilsById = null;

/**
 * @param {typeof fetch} fetchImpl
 */
async function loadCouncilIndex(fetchImpl = fetch) {
  if (councilsById) return councilsById;

  const response = await fetchImpl('https://ukbinday.co.uk/api/v1/councils', {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    councilsById = new Map();
    return councilsById;
  }

  const entries = await response.json();
  councilsById = new Map();
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const record = /** @type {Record<string, unknown>} */ (entry);
      const id = String(record.id ?? '').trim();
      if (!id) continue;
      councilsById.set(id, {
        id,
        name: String(record.name ?? '').trim(),
        url: String(record.url ?? '').trim()
      });
    }
  }
  return councilsById;
}

/**
 * @param {string | null | undefined} councilId
 */
export function isUsableUkBinDayCouncilId(councilId) {
  const id = String(councilId ?? '').trim();
  if (!id) return false;
  return !id.includes('google_public_calendar');
}

/**
 * @param {string} postcode
 * @param {typeof fetch} fetchImpl
 */
export async function fetchUkBinDayCouncil(postcode, fetchImpl = fetch) {
  const normalized = String(postcode ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (!normalized) {
    return { ok: false, status: 400, error: 'Postcode is required.' };
  }

  const response = await fetchImpl(`https://ukbinday.co.uk/api/v1/council/${encodeURIComponent(normalized)}`, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    return { ok: false, status: 503, error: 'Bin day lookup is temporarily unavailable.' };
  }

  const body = await response.json();
  const councilId = String(body?.council_id ?? '').trim() || null;
  const councilName = String(body?.council_name ?? '').trim() || null;

  if (!isUsableUkBinDayCouncilId(councilId)) {
    return { ok: true, supported: false, councilId, councilName, binsUrl: null };
  }

  const index = await loadCouncilIndex(fetchImpl);
  const entry = councilId ? index.get(councilId) : null;
  const binsUrl = entry?.url ? entry.url.replace(/\/$/, '') : null;

  return {
    ok: true,
    supported: Boolean(binsUrl),
    councilId,
    councilName: entry?.name || councilName,
    binsUrl
  };
}

/** @internal test helper */
export function resetUkBinDayCacheForTests() {
  councilsById = null;
}
