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
 * @param {{ postcode?: string, line1?: string, line2?: string, city?: string }} address
 * @param {string | undefined} apiKey
 * @param {typeof fetch} fetchImpl
 */
export async function resolveUprnFromAddress(address, apiKey, fetchImpl = fetch) {
  const key = String(apiKey ?? '').trim();
  if (!key) {
    return { ok: false, code: 'NOT_CONFIGURED', error: 'Address lookup is not configured on this hub.' };
  }

  const term = formatGetAddressSearchTerm(address);
  if (!term) {
    return { ok: false, code: 'MISSING_ADDRESS', error: 'Enter your full address in Guest access first.' };
  }

  const autocompleteUrl = `https://api.getAddress.io/autocomplete/${encodeURIComponent(term)}?api-key=${encodeURIComponent(key)}&top=1`;
  const autocompleteResponse = await fetchImpl(autocompleteUrl, {
    headers: { Accept: 'application/json' }
  });
  if (!autocompleteResponse.ok) {
    return { ok: false, code: 'LOOKUP_FAILED', error: 'Could not match your address for automatic import.' };
  }

  const autocompleteBody = await autocompleteResponse.json();
  const suggestionId = autocompleteBody?.suggestions?.[0]?.id;
  if (!suggestionId) {
    return { ok: false, code: 'NO_MATCH', error: 'Could not match your address — check Guest access or use PDF/paste.' };
  }

  const detailUrl = `https://api.getAddress.io/get/${encodeURIComponent(suggestionId)}?api-key=${encodeURIComponent(key)}`;
  const detailResponse = await fetchImpl(detailUrl, { headers: { Accept: 'application/json' } });
  if (!detailResponse.ok) {
    return { ok: false, code: 'LOOKUP_FAILED', error: 'Could not load address details for automatic import.' };
  }

  const detail = await detailResponse.json();
  const uprn = String(detail?.uprn ?? detail?.UPRN ?? '').trim();
  if (!uprn) {
    return { ok: false, code: 'NO_UPRN', error: 'No UPRN found for this address — use PDF upload or paste instead.' };
  }

  return {
    ok: true,
    uprn,
    formatted: String(detail?.formatted_address ?? detail?.FormattedAddress ?? '').trim() || null
  };
}
