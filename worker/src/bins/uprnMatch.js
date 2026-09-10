/**
 * Shared helpers for matching a hub property address to a UPRN lookup result.
 */

/**
 * @param {{ postcode?: string, line1?: string, line2?: string, city?: string }} address
 */
export function formatAddressSearchTerm(address) {
  return [address.line1, address.line2, address.city, address.postcode].filter(Boolean).join(', ').trim();
}

/**
 * @param {string | undefined} postcode
 */
export function normalizeUkPostcode(postcode) {
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
 * @param {Array<{ uprn?: string, address?: string, match?: number }>} candidates
 * @param {{ line1?: string, line2?: string, city?: string, postcode?: string }} address
 */
export function pickBestUprnCandidate(candidates, address) {
  const line1 = String(address.line1 ?? '').trim().toLowerCase();
  const line2 = String(address.line2 ?? '').trim().toLowerCase();
  const house = extractLeadingHouseToken(line1).toLowerCase();

  let best = null;
  let bestScore = 0;

  for (const candidate of candidates ?? []) {
    const uprn = String(candidate?.uprn ?? '').trim();
    const label = String(candidate?.address ?? '').trim().toLowerCase();
    if (!uprn || !label) continue;

    let score = Number(candidate.match ?? 0) * 10;
    if (line1 && label.includes(line1)) score = Math.max(score, 100);
    else if (house && (label.startsWith(`${house},`) || label.startsWith(`${house} `))) {
      score = Math.max(score, 85);
    } else if (line2 && label.includes(line2)) score = Math.max(score, 70);
    else {
      for (const token of line1.split(/\s+/).filter((part) => part.length > 2)) {
        if (label.includes(token)) score += 12;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = { uprn, address: candidate.address ?? label };
    }
  }

  if (best) return best;
  const fallback = candidates?.find((entry) => String(entry?.uprn ?? '').trim());
  if (!fallback) return null;
  return {
    uprn: String(fallback.uprn).trim(),
    address: String(fallback.address ?? '').trim()
  };
}
