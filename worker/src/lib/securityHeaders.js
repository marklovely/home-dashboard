/**
 * Security headers for Worker (and mirrored intent for Pages — configure there separately).
 */
export function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy':
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  };
}
