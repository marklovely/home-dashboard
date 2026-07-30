/**
 * Geocode a UK postcode or place name for weather lookup.
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} query
 * @param {typeof fetch} fetchImpl
 */
export async function geocodeWeatherQuery(query, env, fetchImpl = fetch) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { status: 400, body: { error: 'Enter a postcode or place name.' } };
  }

  if (isUkPostcode(trimmed)) {
    const postcodeResult = await lookupUkPostcode(trimmed, fetchImpl);
    if (postcodeResult) {
      return { status: 200, body: postcodeResult };
    }
  }

  return lookupPlaceName(trimmed, fetchImpl);
}

/**
 * @param {string} input
 */
function isUkPostcode(input) {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(input.trim());
}

/**
 * @param {string} postcode
 * @param {typeof fetch} fetchImpl
 */
async function lookupUkPostcode(postcode, fetchImpl) {
  const normalized = postcode.replace(/\s+/g, '').toUpperCase();
  const response = await fetchImpl(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const result = data?.result;
  if (!result || typeof result.latitude !== 'number' || typeof result.longitude !== 'number') {
    return null;
  }

  const admin = [result.admin_ward, result.admin_district, result.region].filter(Boolean).join(', ');
  return {
    results: [
      {
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.postcode,
        detail: admin || result.parish || null
      }
    ]
  };
}

/**
 * @param {string} query
 * @param {typeof fetch} fetchImpl
 */
async function lookupPlaceName(query, fetchImpl) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const response = await fetchImpl(url);
  if (!response.ok) {
    return { status: 503, body: { error: 'Location lookup is temporarily unavailable.' } };
  }

  const data = await response.json();
  const results = (data?.results ?? [])
    .filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
    .map((item) => ({
      latitude: item.latitude,
      longitude: item.longitude,
      label: item.name,
      detail: [item.admin1, item.country].filter(Boolean).join(', ') || null
    }));

  if (!results.length) {
    return { status: 404, body: { error: 'No matching location found.' } };
  }

  return { status: 200, body: { results } };
}

/**
 * @param {number} latitude
 * @param {number} longitude
 */
export function weatherCacheKey(latitude, longitude) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

/**
 * @param {string | null | undefined} lat
 * @param {string | null | undefined} lon
 */
export function parseWeatherCoordinateOverride(lat, lon) {
  if (lat == null || lon == null || lat === '' || lon === '') {
    return null;
  }

  const latitude = Number(lat);
  const longitude = Number(lon);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { error: 'Invalid coordinates.' };
  }

  return { latitude, longitude };
}
