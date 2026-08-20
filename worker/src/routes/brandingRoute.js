import { authenticateRequest } from '../lib/requestAuth.js';
import {
  BRAND_LOGO_OBJECT_KEY,
  getBrandMediaObject,
  requireBrandMediaBucket
} from '../lib/brandMediaStorage.js';
import { jsonError } from '../lib/errors.js';

/**
 * Hub branding assets (logo) for all Access-authenticated users.
 *
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {typeof fetch} [fetchImpl]
 * @param {string} correlationId
 */
export async function handleBrandingLogo(request, env, fetchImpl = fetch, correlationId) {
  if (request.method !== 'GET') {
    return jsonError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', { correlationId });
  }

  const auth = await authenticateRequest(request, env, fetchImpl);
  if (!auth.ok) {
    return jsonError(auth.status ?? 403, auth.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  try {
    const bucket = requireBrandMediaBucket(env.BRAND_MEDIA);
    const object = await getBrandMediaObject(bucket, BRAND_LOGO_OBJECT_KEY);
    if (!object) {
      return jsonError(404, 'NOT_FOUND', 'Brand logo not found.', { correlationId });
    }

    const headers = new Headers();
    headers.set(
      'Content-Type',
      String(object.httpMetadata?.contentType ?? 'image/png')
    );
    headers.set('Cache-Control', 'private, max-age=86400');
    headers.set('Content-Disposition', 'inline; filename="lovely-home-logo.png"');

    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof Error && error.code === 'BRAND_MEDIA_NOT_CONFIGURED') {
      return jsonError(503, 'BRAND_MEDIA_NOT_CONFIGURED', 'Brand media is not configured.', {
        correlationId
      });
    }
    throw error;
  }
}
