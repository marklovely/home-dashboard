/**
 * Normalize Apple private ICS URL from Worker secret (never log return value).
 * @param {string | undefined} rawSecret
 * @returns {string | null}
 */
export function normalizeAppleCalendarFeedUrl(rawSecret) {
  if (!rawSecret) return null;
  let raw = rawSecret.trim();
  if (!raw) return null;

  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }

  if (raw.startsWith('webcal://')) {
    raw = `https://${raw.slice('webcal://'.length)}`;
  } else if (raw.startsWith('http://')) {
    raw = `https://${raw.slice('http://'.length)}`;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return null;
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * @param {unknown} error
 */
export function classifyFetchNetworkError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/dns|getaddrinfo|name not resolved/i.test(message)) return 'dns';
  if (/ssl|tls|certificate|cert/i.test(message)) return 'tls';
  if (/redirect/i.test(message)) return 'redirect';
  if (/timeout|timed out/i.test(message)) return 'timeout';
  return 'network';
}

/**
 * @param {unknown} error
 */
export function safeFetchErrorDetail(error) {
  if (!(error instanceof Error)) return 'fetch_failed';
  return error.message.slice(0, 160);
}
