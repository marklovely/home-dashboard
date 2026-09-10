/**
 * @param {{ postcode?: string, line1?: string, line2?: string, city?: string }} address
 */
function formatGetAddressSearchTerm(address) {
  return [address.line1, address.line2, address.city, address.postcode].filter(Boolean).join(', ').trim();
}

/**
 * Resolve a UK property UPRN via getAddress.io (browser — domain-restricted key).
 *
 * @param {import('./propertyAddress.js').PropertyAddress | Record<string, unknown>} address
 * @param {string} apiKey
 * @param {typeof fetch} [fetchImpl]
 */
export async function resolveUprnFromPropertyAddress(address, apiKey, fetchImpl = fetch) {
  const key = String(apiKey ?? '').trim();
  if (!key) {
    return { ok: false, code: 'NOT_CONFIGURED', message: 'UPRN lookup is not configured on this hub.' };
  }

  const term = formatGetAddressSearchTerm(address);
  if (!term) {
    return {
      ok: false,
      code: 'MISSING_ADDRESS',
      message: 'Enter your full address in Guest access first.'
    };
  }

  try {
    const autocompleteUrl = `https://api.getAddress.io/autocomplete/${encodeURIComponent(term)}?api-key=${encodeURIComponent(key)}&top=1`;
    const autocompleteResponse = await fetchImpl(autocompleteUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!autocompleteResponse.ok) {
      return {
        ok: false,
        code: 'LOOKUP_FAILED',
        message: 'Could not match your address for automatic import.'
      };
    }

    const autocompleteBody = await autocompleteResponse.json();
    const suggestionId = autocompleteBody?.suggestions?.[0]?.id;
    if (!suggestionId) {
      return {
        ok: false,
        code: 'NO_MATCH',
        message: 'Could not match your address — check Guest access or use PDF/paste.'
      };
    }

    const detailUrl = `https://api.getAddress.io/get/${encodeURIComponent(suggestionId)}?api-key=${encodeURIComponent(key)}`;
    const detailResponse = await fetchImpl(detailUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!detailResponse.ok) {
      return {
        ok: false,
        code: 'LOOKUP_FAILED',
        message: 'Could not load address details for automatic import.'
      };
    }

    const detail = await detailResponse.json();
    const uprn = String(detail?.uprn ?? detail?.UPRN ?? '').trim();
    if (!uprn) {
      return {
        ok: false,
        code: 'NO_UPRN',
        message: 'No UPRN found for this address — use PDF upload or paste instead.'
      };
    }

    return { ok: true, uprn };
  } catch {
    return {
      ok: false,
      code: 'LOOKUP_FAILED',
      message: 'Could not look up your property ID right now — try again or use PDF/paste.'
    };
  }
}
