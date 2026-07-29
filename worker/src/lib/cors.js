/**
 * @param {string | undefined} originHeader
 * @param {string} allowedOriginsCsv
 */
export function resolveCorsOrigin(originHeader, allowedOriginsCsv) {
  if (!originHeader) return null;
  const allowed = allowedOriginsCsv
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (allowed.length === 0) return null;

  for (const pattern of allowed) {
    if (pattern === originHeader) return originHeader;
    if (pattern.includes('*')) {
      const regex = new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);
      if (regex.test(originHeader)) return originHeader;
    }
  }
  return null;
}

/**
 * @param {string | null} allowedOrigin
 */
export function corsHeaders(allowedOrigin) {
  if (!allowedOrigin) return {};
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-Id',
    Vary: 'Origin'
  };
}
