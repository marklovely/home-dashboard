/**
 * @param {R2Bucket | undefined} bucket
 */
export function requireGuideMediaBucket(bucket) {
  if (!bucket) {
    const error = new Error('GUIDE_MEDIA_NOT_CONFIGURED');
    error.code = 'GUIDE_MEDIA_NOT_CONFIGURED';
    throw error;
  }
  return bucket;
}

export function generateGuideMediaObjectKey() {
  return `media/${crypto.randomUUID()}`;
}

/**
 * @param {R2Bucket} bucket
 * @param {string} objectKey
 * @param {ArrayBuffer} buffer
 * @param {string} mimeType
 */
export async function putGuideMediaObject(bucket, objectKey, buffer, mimeType) {
  await bucket.put(objectKey, buffer, {
    httpMetadata: {
      contentType: mimeType
    }
  });
}

/**
 * @param {R2Bucket} bucket
 * @param {string} objectKey
 */
export async function getGuideMediaObject(bucket, objectKey) {
  return bucket.get(objectKey);
}

/**
 * @param {R2Bucket} bucket
 * @param {string} objectKey
 */
export async function safeDeleteGuideMediaObject(bucket, objectKey) {
  if (!objectKey) return false;
  try {
    await bucket.delete(objectKey);
    return true;
  } catch {
    return false;
  }
}
