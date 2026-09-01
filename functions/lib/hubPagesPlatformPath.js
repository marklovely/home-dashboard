/**
 * Hub Pages must 503 operator platform routes, except site-archive which the Worker owns.
 * @param {string} suffix
 */
export function hubPagesPlatformPathUnavailable(suffix) {
  return suffix !== 'platform/site-archive' && (suffix === 'platform' || suffix.startsWith('platform/'));
}
