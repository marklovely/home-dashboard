/**
 * @param {string} a
 * @param {string} b
 */
function timingSafeEqualString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export function isPlatformSiteArchiveAuthorized(request, env) {
  const expected = env.PLATFORM_SITE_ARCHIVE_SECRET?.trim();
  if (!expected) return false;
  const provided = request.headers.get('X-Platform-Site-Archive-Secret')?.trim();
  if (!provided) return false;
  return timingSafeEqualString(provided, expected);
}
