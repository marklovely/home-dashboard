const GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const GOOGLE_PLACES_DETAILS_FIELD_MASK = 'addressComponents,postalAddress,formattedAddress';

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
  const line2 = addressLines[1] ?? subpremise;
  const line3 = addressLines[2] ?? '';

  const city =
    String(postal?.locality ?? '').trim() ||
    componentText(components, 'postal_town') ||
    componentText(components, 'locality');

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
 * @param {Response} response
 */
async function readGooglePlacesBrowserFailure(response) {
  let message = '';
  try {
    const body = await response.json();
    message = String(body?.error?.message ?? body?.message ?? '').trim();
  } catch {
    /* ignore */
  }

  if (response.status === 403 || response.status === 401) {
    if (/referer|referrer/i.test(message)) {
      return 'Google rejected the API key for this site. In Google Cloud Console, add your hub hostname (e.g. smith.lovely-hub.com) under HTTP referrers for this key.';
    }
    return (
      message ||
      'Google Places rejected the API key. Enable Places API (New) and check key restrictions in Google Cloud Console.'
    );
  }

  return message || `Address lookup failed (HTTP ${response.status}).`;
}

/**
 * @param {string} term
 * @param {string} countryCode
 * @param {string} apiKey
 * @param {string} sessionToken
 * @param {typeof fetch} fetchImpl
 */
export async function browserPlacesAutocomplete(term, countryCode, apiKey, sessionToken, fetchImpl = fetch) {
  /** @type {Record<string, unknown>} */
  const body = {
    input: term,
    includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
    languageCode: 'en-GB',
    regionCode: countryCode.toLowerCase(),
    includedRegionCodes: [countryCode.toLowerCase()]
  };
  if (sessionToken) body.sessionToken = sessionToken;

  const response = await fetchImpl(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
    },
    cache: 'no-store',
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return { ok: false, message: await readGooglePlacesBrowserFailure(response) };
  }

  const payload = await response.json();
  const suggestions = Array.isArray(payload?.suggestions)
    ? payload.suggestions
        .map((entry) => {
          const prediction = entry?.placePrediction;
          const id = String(prediction?.placeId ?? '').trim();
          const label = String(prediction?.text?.text ?? '').trim();
          return id && label ? { id, label } : null;
        })
        .filter(Boolean)
    : [];

  return { ok: true, suggestions };
}

/**
 * @param {string} placeId
 * @param {string} countryCode
 * @param {string} apiKey
 * @param {string} sessionToken
 * @param {typeof fetch} fetchImpl
 */
export async function browserPlacesLookup(placeId, countryCode, apiKey, sessionToken, fetchImpl = fetch) {
  const sessionQuery = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';
  const response = await fetchImpl(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}${sessionQuery}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_PLACES_DETAILS_FIELD_MASK
      },
      cache: 'no-store'
    }
  );

  if (!response.ok) {
    return { ok: false, message: await readGooglePlacesBrowserFailure(response) };
  }

  const place = await response.json();
  return { ok: true, address: mapGooglePlaceToPropertyAddress(place, countryCode) };
}
