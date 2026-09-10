/**
 * Optional UPRN resolution via getAddress.io (requires GETADDRESS_API_KEY).
 * @see https://documentation.getaddress.io/
 */

/**
 * @param {{ postcode?: string, line1?: string, line2?: string, city?: string }} address
 */
export function formatGetAddressSearchTerm(address) {
  return [address.line1, address.line2, address.city, address.postcode].filter(Boolean).join(', ').trim();
}

/**
 * @param {string | undefined} postcode
 */
export function normalizePostcodeForGetAddress(postcode) {
  return String(postcode ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

/**
 * @param {string | undefined} line1
 */
export function extractLeadingHouseToken(line1) {
  const trimmed = String(line1 ?? '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(\d+[A-Za-z]?|\d+\/\d+|[A-Za-z0-9-]+)/);
  return match?.[1] ?? '';
}

/**
 * @param {Array<{ id?: string, address?: string, text?: string }>} suggestions
 * @param {{ line1?: string, line2?: string, city?: string, postcode?: string }} address
 */
export function pickBestGetAddressSuggestion(suggestions, address) {
  const line1 = String(address.line1 ?? '').trim().toLowerCase();
  const line2 = String(address.line2 ?? '').trim().toLowerCase();
  const house = extractLeadingHouseToken(line1).toLowerCase();

  let best = null;
  let bestScore = 0;

  for (const suggestion of suggestions ?? []) {
    const id = String(suggestion?.id ?? '').trim();
    const label = String(suggestion?.address ?? suggestion?.text ?? '').trim().toLowerCase();
    if (!id || !label) continue;

    let score = 0;
    if (line1 && label.includes(line1)) score = 100;
    else if (house && (label.startsWith(`${house},`) || label.startsWith(`${house} `))) score = 85;
    else if (line2 && label.includes(line2)) score = 70;
    else {
      for (const token of line1.split(/\s+/).filter((part) => part.length > 2)) {
        if (label.includes(token)) score += 12;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = { id, label: suggestion.address ?? suggestion.text ?? label };
    }
  }

  return bestScore > 0 ? best : suggestions?.[0]?.id ? { id: String(suggestions[0].id), label: '' } : null;
}

/**
 * @param {Response} response
 */
async function readGetAddressErrorMessage(response) {
  try {
    const body = await response.json();
    return String(body?.Message ?? body?.message ?? '').trim();
  } catch {
    return '';
  }
}

/**
 * @param {string} url
 * @param {typeof fetch} fetchImpl
 */
async function fetchGetAddressJson(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    return { ok: false, response, body: null, error: await readGetAddressErrorMessage(response) };
  }
  return { ok: true, response, body: await response.json(), error: '' };
}

/**
 * @param {string} suggestionId
 * @param {string} apiKey
 * @param {typeof fetch} fetchImpl
 */
async function fetchUprnForSuggestionId(suggestionId, apiKey, fetchImpl) {
  const detailUrl = `https://api.getAddress.io/get/${encodeURIComponent(suggestionId)}?api-key=${encodeURIComponent(apiKey)}`;
  const detail = await fetchGetAddressJson(detailUrl, fetchImpl);
  if (!detail.ok) {
    return { ok: false, code: 'LOOKUP_FAILED', error: 'Could not load address details for automatic import.' };
  }

  const uprn = String(detail.body?.uprn ?? detail.body?.UPRN ?? '').trim();
  if (!uprn) {
    return { ok: false, code: 'NO_UPRN', error: 'No UPRN found for this address — use PDF upload or paste instead.' };
  }

  return {
    ok: true,
    uprn,
    formatted: String(detail.body?.formatted_address ?? detail.body?.FormattedAddress ?? '').trim() || null
  };
}

/**
 * @param {string} term
 * @param {string} apiKey
 * @param {typeof fetch} fetchImpl
 * @param {{ top?: number, all?: boolean }} [options]
 */
async function autocompleteSuggestions(term, apiKey, fetchImpl, options = {}) {
  const params = new URLSearchParams({
    'api-key': apiKey,
    top: String(options.top ?? 6)
  });
  if (options.all) params.set('all', 'true');

  const url = `https://api.getAddress.io/autocomplete/${encodeURIComponent(term)}?${params.toString()}`;
  const result = await fetchGetAddressJson(url, fetchImpl);
  if (!result.ok) {
    return { ok: false, error: result.error, status: result.response.status, suggestions: [] };
  }

  const suggestions = Array.isArray(result.body?.suggestions) ? result.body.suggestions : [];
  return { ok: true, suggestions, error: '', status: 200 };
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
        'Automatic import needs a property ID (UPRN) for your address. Google address lookup does not provide this — your hub admin needs to set GETADDRESS_API_KEY on the Worker, or use PDF upload / paste instead.'
    };
  }

  const postcode = normalizePostcodeForGetAddress(address.postcode);
  const line1 = String(address.line1 ?? '').trim();
  if (!postcode && !line1) {
    return { ok: false, code: 'MISSING_ADDRESS', error: 'Enter your full address in Guest access first.' };
  }

  /** @type {Array<{ term: string, top?: number, all?: boolean }>} */
  const attempts = [];
  const fullTerm = formatGetAddressSearchTerm(address);
  if (fullTerm) attempts.push({ term: fullTerm, top: 6 });
  if (line1 && postcode) attempts.push({ term: `${line1}, ${postcode}`, top: 6 });
  if (postcode) attempts.push({ term: postcode, top: 20, all: true });

  let lastError = '';
  let lastStatus = 0;

  for (const attempt of attempts) {
    const autocomplete = await autocompleteSuggestions(attempt.term, key, fetchImpl, attempt);
    if (!autocomplete.ok) {
      lastError = autocomplete.error;
      lastStatus = autocomplete.status;
      if (autocomplete.status === 401) {
        return {
          ok: false,
          code: 'LOOKUP_FAILED',
          error:
            'The getAddress API key on this hub Worker is invalid or missing — check GETADDRESS_API_KEY on the correct environment.'
        };
      }
      continue;
    }

    const best = pickBestGetAddressSuggestion(autocomplete.suggestions, address);
    if (!best?.id) continue;

    const uprnResult = await fetchUprnForSuggestionId(best.id, key, fetchImpl);
    if (uprnResult.ok) return uprnResult;
    lastError = uprnResult.error;
  }

  if (lastStatus === 401) {
    return {
      ok: false,
      code: 'LOOKUP_FAILED',
      error:
        'The getAddress API key on this hub Worker is invalid or missing — check GETADDRESS_API_KEY on the correct environment.'
    };
  }

  return {
    ok: false,
    code: 'NO_MATCH',
    error:
      lastError ||
      'Could not match your address to a property ID — check line 1 and postcode in Guest access, or use PDF/paste.'
  };
}
