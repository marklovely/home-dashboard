import councilHints from '../data/councilHints.json';

/**
 * @param {string} input
 */
export function isUkPostcode(input) {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(String(input ?? '').trim());
}

/**
 * @param {string} district
 */
function normalizeDistrictKey(district) {
  return String(district ?? '')
    .trim()
    .toLowerCase();
}

/**
 * @param {string} adminDistrict
 */
export function lookupCouncilHint(adminDistrict) {
  const normalized = normalizeDistrictKey(adminDistrict);
  if (!normalized) return null;

  const direct = /** @type {Record<string, { councilName?: string, binsUrl?: string, suggestedPattern?: string }>} */ (
    councilHints
  )[adminDistrict.trim()];
  if (direct) return direct;

  for (const [key, value] of Object.entries(councilHints)) {
    if (normalizeDistrictKey(key) === normalized) {
      return value;
    }
  }

  return null;
}

/**
 * @param {string} postcode
 * @param {typeof fetch} fetchImpl
 */
export async function lookupUkPostcodeDistrict(postcode, fetchImpl = fetch) {
  const normalized = String(postcode ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (!normalized || !isUkPostcode(normalized)) {
    return { status: 400, body: { error: 'Enter a valid UK postcode.' } };
  }

  const response = await fetchImpl(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`);
  if (response.status === 404) {
    return { status: 404, body: { error: 'Postcode not found.' } };
  }
  if (!response.ok) {
    return { status: 503, body: { error: 'Postcode lookup is temporarily unavailable.' } };
  }

  const data = await response.json();
  const result = data?.result;
  if (!result) {
    return { status: 404, body: { error: 'Postcode not found.' } };
  }

  const adminDistrict = String(result.admin_district ?? '').trim();
  const region = String(result.region ?? '').trim();
  const hint = lookupCouncilHint(adminDistrict);

  return {
    status: 200,
    body: {
      postcode: String(result.postcode ?? normalized),
      adminDistrict: adminDistrict || null,
      region: region || null,
      councilName: hint?.councilName ?? null,
      binsUrl: hint?.binsUrl ?? null,
      suggestedPattern: hint?.suggestedPattern ?? null
    }
  };
}

/**
 * @param {string} postcode
 * @param {typeof fetch} fetchImpl
 */
export async function resolveCouncilHint(postcode, fetchImpl = fetch) {
  const trimmed = String(postcode ?? '').trim();
  if (!trimmed) {
    return { status: 400, body: { error: 'Postcode is required.' } };
  }
  if (!isUkPostcode(trimmed)) {
    return { status: 400, body: { error: 'Enter a valid UK postcode.' } };
  }
  return lookupUkPostcodeDistrict(trimmed, fetchImpl);
}
