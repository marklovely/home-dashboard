const GETADDRESS_AUTOCOMPLETE_URL = 'https://api.getAddress.io/autocomplete';
const GETADDRESS_GET_URL = 'https://api.getAddress.io/get';

/**
 * @param {string} token
 * @param {string} term
 * @param {typeof fetch} fetchImpl
 */
export async function browserAutocomplete(term, token, fetchImpl = fetch) {
  const endpoint = `${GETADDRESS_AUTOCOMPLETE_URL}/${encodeURIComponent(term)}?api-key=${encodeURIComponent(token)}&all=true`;
  const response = await fetchImpl(endpoint, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(data?.Message ?? data?.message ?? '').trim();
    return {
      ok: false,
      message:
        message ||
        (response.status === 401
          ? 'Address lookup rejected the Domain Token. Check the host matches this hub on getAddress.io.'
          : `Address lookup failed (HTTP ${response.status}).`)
    };
  }
  const suggestions = Array.isArray(data?.suggestions)
    ? data.suggestions
        .map((entry) => ({
          id: String(entry?.id ?? ''),
          label: String(entry?.address ?? '')
        }))
        .filter((entry) => entry.id && entry.label)
    : [];
  return { ok: true, suggestions };
}

/**
 * @param {string} token
 * @param {string} id
 * @param {typeof fetch} fetchImpl
 */
export async function browserGetAddress(token, id, fetchImpl = fetch) {
  const endpoint = `${GETADDRESS_GET_URL}/${encodeURIComponent(id)}?api-key=${encodeURIComponent(token)}`;
  const response = await fetchImpl(endpoint, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, message: String(data?.Message ?? data?.message ?? 'Could not load that address.') };
  }
  return {
    ok: true,
    address: {
      line1: String(data?.line_1 ?? data?.line1 ?? '').trim(),
      line2: String(data?.line_2 ?? data?.line2 ?? '').trim(),
      line3: String(data?.line_3 ?? data?.line3 ?? '').trim(),
      city: String(data?.town_or_city ?? data?.city ?? '').trim(),
      county: String(data?.county ?? data?.district ?? '').trim(),
      country: 'United Kingdom',
      postcode: String(data?.postcode ?? '').trim()
    }
  };
}
