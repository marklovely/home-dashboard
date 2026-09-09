import { fetchGovUkLocalAuthority } from './govUkLocalAuthority.js';
import { fetchUkBinDayCouncil, isUsableUkBinDayCouncilId } from './ukBinDay.js';

/**
 * @param {string} input
 */
export function isUkPostcode(input) {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(String(input ?? '').trim());
}

/**
 * @param {string | null | undefined} tier
 */
function defaultSuggestedPattern(tier) {
  if (tier === 'district' || tier === 'unitary' || tier === 'metropolitan') {
    return 'alternating';
  }
  return null;
}

/**
 * @param {string} postcode
 * @param {typeof fetch} fetchImpl
 */
async function fetchPostcodeDistrict(postcode, fetchImpl = fetch) {
  const normalized = String(postcode ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();
  const response = await fetchImpl(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`);
  if (!response.ok) return null;

  const data = await response.json();
  const result = data?.result;
  if (!result) return null;

  return {
    postcode: String(result.postcode ?? normalized),
    adminDistrict: String(result.admin_district ?? '').trim() || null,
    region: String(result.region ?? '').trim() || null
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

  const [govUk, ukBinDay, district] = await Promise.all([
    fetchGovUkLocalAuthority(trimmed, fetchImpl),
    fetchUkBinDayCouncil(trimmed, fetchImpl),
    fetchPostcodeDistrict(trimmed, fetchImpl)
  ]);

  if (!govUk.ok && govUk.status === 404) {
    return { status: 404, body: { error: govUk.error ?? 'Postcode not found.' } };
  }
  if (!govUk.ok) {
    return { status: govUk.status ?? 503, body: { error: govUk.error ?? 'Council lookup failed.' } };
  }

  const authority = govUk.authority;
  const councilName = authority?.name ?? ukBinDay.councilName ?? null;
  const councilHomepageUrl = authority?.homepageUrl ?? null;
  const binsUrl =
    (ukBinDay.ok && ukBinDay.supported && ukBinDay.binsUrl) || councilHomepageUrl || null;

  return {
    status: 200,
    body: {
      postcode: district?.postcode ?? trimmed.replace(/\s+/g, '').toUpperCase(),
      adminDistrict: district?.adminDistrict ?? councilName,
      region: district?.region ?? null,
      councilName,
      councilHomepageUrl,
      binsUrl,
      councilSlug: authority?.slug ?? null,
      ukBinDaySupported: Boolean(ukBinDay.ok && ukBinDay.supported && isUsableUkBinDayCouncilId(ukBinDay.councilId)),
      ukBinDayCouncilId:
        ukBinDay.ok && isUsableUkBinDayCouncilId(ukBinDay.councilId) ? ukBinDay.councilId : null,
      suggestedPattern: defaultSuggestedPattern(authority?.tier)
    }
  };
}
