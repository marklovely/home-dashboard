/**
 * GOV.UK "Find your local council" API — postcode → council name + homepage.
 * @see https://www.gov.uk/find-local-council
 */

/**
 * @param {string} postcode
 */
export function formatUkPostcode(postcode) {
  const normalized = String(postcode ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (normalized.length <= 3) return normalized;
  return `${normalized.slice(0, -3)} ${normalized.slice(-3)}`;
}

/**
 * @param {string | undefined | null} url
 */
export function normalizeCouncilHomepage(url) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`;
  }
  if (trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/**
 * @param {unknown} body
 * @returns {{ slug: string, name: string } | null}
 */
export function pickGovUkAuthorityRef(body) {
  if (!body || typeof body !== 'object') return null;
  const record = /** @type {Record<string, unknown>} */ (body);
  const authority = record.local_authority;
  if (authority && typeof authority === 'object') {
    const local = /** @type {Record<string, unknown>} */ (authority);
    const slug = String(local.slug ?? '').trim();
    const name = String(local.name ?? '').trim();
    if (slug && name) return { slug, name };
  }

  const addresses = record.addresses;
  if (Array.isArray(addresses) && addresses.length > 0) {
    const first = addresses[0];
    if (first && typeof first === 'object') {
      const address = /** @type {Record<string, unknown>} */ (first);
      const slug = String(address.local_authority_slug ?? '').trim();
      const name = String(address.local_authority_name ?? '').trim();
      if (slug && name) return { slug, name };
    }
  }

  return null;
}

/**
 * @param {unknown} body
 */
export function parseGovUkLocalAuthority(body) {
  if (!body || typeof body !== 'object') return null;
  const authority = /** @type {Record<string, unknown>} */ (body).local_authority;
  if (!authority || typeof authority !== 'object') return null;

  const local = /** @type {Record<string, unknown>} */ (authority);
  const name = String(local.name ?? '').trim();
  const slug = String(local.slug ?? '').trim();
  const homepageUrl = normalizeCouncilHomepage(local.homepage_url);
  const tier = String(local.tier ?? '').trim();

  if (!name) return null;

  return {
    name,
    slug: slug || null,
    homepageUrl,
    tier: tier || null
  };
}

/**
 * @param {string} postcode
 * @param {typeof fetch} fetchImpl
 */
export async function fetchGovUkLocalAuthority(postcode, fetchImpl = fetch) {
  const formatted = formatUkPostcode(postcode);
  const lookupUrl = `https://www.gov.uk/api/local-authority?postcode=${encodeURIComponent(formatted)}`;
  const lookupResponse = await fetchImpl(lookupUrl, {
    headers: { Accept: 'application/json' },
    redirect: 'follow'
  });

  if (lookupResponse.status === 404) {
    return { ok: false, status: 404, error: 'Postcode not found.' };
  }
  if (!lookupResponse.ok) {
    return { ok: false, status: 503, error: 'Council lookup is temporarily unavailable.' };
  }

  const lookupBody = await lookupResponse.json();
  const direct = parseGovUkLocalAuthority(lookupBody);
  if (direct) {
    return { ok: true, authority: direct };
  }

  const ref = pickGovUkAuthorityRef(lookupBody);
  if (!ref) {
    return { ok: false, status: 404, error: 'Council not found for this postcode.' };
  }

  const slugResponse = await fetchImpl(`https://www.gov.uk/api/local-authority/${encodeURIComponent(ref.slug)}`, {
    headers: { Accept: 'application/json' },
    redirect: 'follow'
  });
  if (!slugResponse.ok) {
    return {
      ok: true,
      authority: {
        name: ref.name,
        slug: ref.slug,
        homepageUrl: null,
        tier: null
      }
    };
  }

  const slugBody = await slugResponse.json();
  const authority = parseGovUkLocalAuthority(slugBody);
  if (authority) {
    return { ok: true, authority };
  }

  return {
    ok: true,
    authority: {
      name: ref.name,
      slug: ref.slug,
      homepageUrl: null,
      tier: null
    }
  };
}
