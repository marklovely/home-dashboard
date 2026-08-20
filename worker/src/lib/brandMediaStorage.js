/** @typedef {import('@cloudflare/workers-types').R2Bucket} R2Bucket */

export const BRAND_LOGO_OBJECT_KEY = 'lovely-home-logo.png';

/**
 * @param {R2Bucket | undefined} bucket
 */
export function requireBrandMediaBucket(bucket) {
  if (!bucket) {
    const error = new Error('BRAND_MEDIA_NOT_CONFIGURED');
    error.code = 'BRAND_MEDIA_NOT_CONFIGURED';
    throw error;
  }
  return bucket;
}

/**
 * @param {R2Bucket} bucket
 * @param {string} objectKey
 */
export async function getBrandMediaObject(bucket, objectKey) {
  return bucket.get(objectKey);
}
