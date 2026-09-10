import { OS_PLACES_API_BASE } from '../lib/osPlaces.js';
import {
  formatAddressSearchTerm,
  normalizeUkPostcode,
  pickBestUprnCandidate
} from './uprnMatch.js';

/**
 * @param {unknown} result
 */
export function mapOsPlacesResult(result) {
  const dpa = result?.DPA;
  const lpi = result?.LPI;
  const record = dpa ?? lpi;
  if (!record || typeof record !== 'object') return null;

  const uprn = String(record.UPRN ?? '').trim();
  if (!uprn) return null;

  return {
    uprn,
    address: String(record.ADDRESS ?? '').trim(),
    match: Number(record.MATCH ?? 0)
  };
}

/**
 * @param {Response} response
 */
async function readOsPlacesErrorMessage(response) {
  try {
    const body = await response.json();
    return String(body?.error?.message ?? body?.message ?? body?.fault?.faultstring ?? '').trim();
  } catch {
    return '';
  }
}

/**
 * @param {number} status
 * @param {string} detail
 */
function osPlacesFailureMessage(status, detail) {
  const upstream = detail || (status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : '');
  if (status === 401) {
    return (
      `OS Places rejected the API key${upstream ? ` (${upstream})` : ''}. ` +
      'Check OS_PLACES_API_KEY on this Worker and that OS Places API is enabled on your OS Data Hub project.'
    );
  }
  if (status === 403) {
    return (
      `OS Places blocked this request${upstream ? ` (${upstream})` : ''}. ` +
      'Your OS Data Hub project may need Premium Plan access or Places API enabled for this key.'
    );
  }
  return upstream || 'Could not look up your property ID.';
}

/**
 * @param {string} path
 * @param {Record<string, string>} params
 * @param {string} apiKey
 * @param {typeof fetch} fetchImpl
 */
async function fetchOsPlaces(path, params, apiKey, fetchImpl) {
  const url = new URL(`${OS_PLACES_API_BASE}${path}`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('format', 'JSON');
  for (const [name, value] of Object.entries(params)) {
    if (value) url.searchParams.set(name, value);
  }

  const response = await fetchImpl(url.toString(), {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: await readOsPlacesErrorMessage(response),
      candidates: []
    };
  }

  const body = await response.json();
  const candidates = Array.isArray(body?.results)
    ? body.results.map(mapOsPlacesResult).filter(Boolean)
    : [];

  return { ok: true, status: 200, error: '', candidates };
}

/**
 * @param {{ postcode?: string, line1?: string, line2?: string, city?: string }} address
 * @param {string | undefined} apiKey
 * @param {typeof fetch} fetchImpl
 */
export async function resolveUprnFromAddress(address, apiKey, fetchImpl = fetch) {
  const key = String(apiKey ?? '').trim();
  if (!key) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      error:
        'Automatic import needs a property ID (UPRN). Set OS_PLACES_API_KEY on this hub Worker (OS Data Hub → API key with OS Places enabled).'
    };
  }

  const postcode = normalizeUkPostcode(address.postcode);
  const line1 = String(address.line1 ?? '').trim();
  if (!postcode && !line1) {
    return { ok: false, code: 'MISSING_ADDRESS', error: 'Enter your full address in Guest access first.' };
  }

  /** @type {Array<{ path: string, params: Record<string, string> }>} */
  const attempts = [];
  if (postcode) attempts.push({ path: '/postcode', params: { postcode, maxresults: '100' } });

  const fullTerm = formatAddressSearchTerm(address);
  if (fullTerm) attempts.push({ path: '/find', params: { query: fullTerm, maxresults: '20' } });
  if (line1 && postcode) {
    attempts.push({ path: '/find', params: { query: `${line1}, ${postcode}`, maxresults: '20' } });
  }

  let lastError = '';
  let lastStatus = 0;

  for (const attempt of attempts) {
    const result = await fetchOsPlaces(attempt.path, attempt.params, key, fetchImpl);
    if (!result.ok) {
      lastError = result.error;
      lastStatus = result.status;
      if (result.status === 401 || result.status === 403) {
        return {
          ok: false,
          code: 'LOOKUP_FAILED',
          error: osPlacesFailureMessage(result.status, result.error)
        };
      }
      continue;
    }

    const best = pickBestUprnCandidate(result.candidates, address);
    if (best?.uprn) {
      return { ok: true, uprn: best.uprn, formatted: best.address || null };
    }
  }

  if (lastStatus === 401 || lastStatus === 403) {
    return {
      ok: false,
      code: 'LOOKUP_FAILED',
      error: osPlacesFailureMessage(lastStatus, lastError)
    };
  }

  return {
    ok: false,
    code: 'NO_MATCH',
    error:
      lastError ||
      'Could not match your address to a UPRN — check line 1 and postcode in Guest access, or use PDF/paste.'
  };
}
