export const GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

const GOOGLE_PLACES_DETAILS_FIELD_MASK = 'addressComponents,postalAddress,formattedAddress';

/**
 * @param {string | undefined} raw
 */
export function normalizePlacesApiKey(raw) {
  return String(raw ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function resolveGooglePlacesConfig(env) {
  const apiKey = normalizePlacesApiKey(env.GOOGLE_PLACES_API_KEY);
  return {
    configured: Boolean(apiKey),
    apiKey
  };
}

/**
 * @param {string} countryCode
 * @returns {string[]}
 */
export function googleRegionCodesForCountry(countryCode) {
  const normalized = String(countryCode ?? '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return [];
  return [normalized.toLowerCase()];
}

/**
 * @param {Response} response
 */
export async function readGooglePlacesFailure(response) {
  let upstreamMessage = '';
  try {
    const body = await response.json();
    upstreamMessage = String(body?.error?.message ?? body?.message ?? '').trim();
  } catch {
    /* ignore */
  }

  if (response.status === 403 || response.status === 401) {
    return {
      code: 'INVALID_API_KEY',
      message:
        'Address lookup rejected the Google Places API key. Set GOOGLE_PLACES_API_KEY on the hub Worker and enable Places API (New) in Google Cloud Console.'
    };
  }
  if (response.status === 429) {
    return {
      code: 'RATE_LIMITED',
      message: 'Address lookup is temporarily rate-limited. Try again shortly.'
    };
  }

  const statusHint = upstreamMessage || `Google Places API returned HTTP ${response.status}`;
  return {
    code: 'LOOKUP_FAILED',
    message: `Address lookup failed (${statusHint}).`
  };
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {string} apiKey
 * @param {unknown} body
 * @param {Record<string, string>} [extraHeaders]
 */
async function postGooglePlaces(fetchImpl, apiKey, body, extraHeaders = {}) {
  try {
    const response = await fetchImpl(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });
    return { ok: true, response, failure: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 200) : 'unknown';
    console.error(JSON.stringify({ event: 'google_places_fetch_failed', detail }));
    return {
      ok: false,
      response: null,
      failure: {
        code: 'FETCH_FAILED',
        message: 'Could not reach Google Places from the hub Worker. Try again shortly.'
      }
    };
  }
}

/**
 * @param {string} term
 * @param {string} countryCode
 * @param {string} apiKey
 * @param {string} [sessionToken]
 * @param {typeof fetch} fetchImpl
 */
export async function googlePlacesAutocomplete(
  term,
  countryCode,
  apiKey,
  sessionToken = '',
  fetchImpl = fetch
) {
  /** @type {Record<string, unknown>} */
  const body = {
    input: term,
    includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
    languageCode: 'en-GB',
    regionCode: countryCode.toLowerCase()
  };
  const regionCodes = googleRegionCodesForCountry(countryCode);
  if (regionCodes.length) {
    body.includedRegionCodes = regionCodes;
  }
  if (sessionToken) {
    body.sessionToken = sessionToken;
  }

  const upstream = await postGooglePlaces(fetchImpl, apiKey, body);
  if (!upstream.ok) return upstream;

  const response = upstream.response;
  if (!response.ok) {
    return { ok: false, response, failure: await readGooglePlacesFailure(response) };
  }

  const payload = await response.json();
  const suggestions = Array.isArray(payload?.suggestions)
    ? payload.suggestions
        .map((entry) => {
          const prediction = entry?.placePrediction;
          const id = String(prediction?.placeId ?? '').trim();
          const label = String(prediction?.text?.text ?? prediction?.structuredFormat?.mainText?.text ?? '').trim();
          return id && label ? { id, label } : null;
        })
        .filter(Boolean)
    : [];

  return { ok: true, response, suggestions, failure: null };
}

/**
 * @param {Array<{ types?: string[], longText?: string, shortText?: string }>} components
 * @param {string} type
 */
function componentText(components, type) {
  const match = components.find((entry) => Array.isArray(entry?.types) && entry.types.includes(type));
  return String(match?.longText ?? match?.shortText ?? '').trim();
}

/**
 * @param {unknown} place
 * @param {string} countryCode
 */
export function mapGooglePlaceToPropertyAddress(place, countryCode = 'GB') {
  const postal = place?.postalAddress ?? {};
  const addressLines = Array.isArray(postal?.addressLines)
    ? postal.addressLines.map((line) => String(line ?? '').trim()).filter(Boolean)
    : [];

  const components = Array.isArray(place?.addressComponents) ? place.addressComponents : [];
  const streetNumber = componentText(components, 'street_number');
  const route = componentText(components, 'route');
  const subpremise = componentText(components, 'subpremise');
  const premise = componentText(components, 'premise');

  let line1 = addressLines[0] ?? '';
  if (!line1) {
    line1 = [streetNumber, route].filter(Boolean).join(' ').trim() || premise;
  }
  let line2 = addressLines[1] ?? subpremise;
  const line3 = addressLines[2] ?? '';

  const city =
    String(postal?.locality ?? '').trim() ||
    componentText(components, 'postal_town') ||
    componentText(components, 'locality') ||
    componentText(components, 'postal_town');

  const county =
    String(postal?.administrativeArea ?? '').trim() ||
    componentText(components, 'administrative_area_level_2') ||
    componentText(components, 'administrative_area_level_1');

  const postcode =
    String(postal?.postalCode ?? '').trim() || componentText(components, 'postal_code');

  const countryName =
    String(postal?.regionCode ?? '').toUpperCase() === 'GB'
      ? 'United Kingdom'
      : componentText(components, 'country') ||
        (countryCode === 'GB' ? 'United Kingdom' : '');

  return {
    line1,
    line2,
    line3,
    city,
    county,
    country: countryName,
    postcode
  };
}

/**
 * @param {string} placeId
 * @param {string} apiKey
 * @param {string} countryCode
 * @param {string} [sessionToken]
 * @param {typeof fetch} fetchImpl
 */
export async function googlePlacesLookup(
  placeId,
  apiKey,
  countryCode = 'GB',
  sessionToken = '',
  fetchImpl = fetch
) {
  const encodedId = encodeURIComponent(placeId);
  const sessionQuery = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';
  const url = `https://places.googleapis.com/v1/places/${encodedId}${sessionQuery}`;

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_PLACES_DETAILS_FIELD_MASK
      }
    });

    if (!response.ok) {
      return { ok: false, response, failure: await readGooglePlacesFailure(response) };
    }

    const place = await response.json();
    return {
      ok: true,
      response,
      address: mapGooglePlaceToPropertyAddress(place, countryCode),
      failure: null
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 200) : 'unknown';
    console.error(JSON.stringify({ event: 'google_places_lookup_failed', detail }));
    return {
      ok: false,
      response: null,
      failure: {
        code: 'FETCH_FAILED',
        message: 'Could not reach Google Places from the hub Worker. Try again shortly.'
      }
    };
  }
}
