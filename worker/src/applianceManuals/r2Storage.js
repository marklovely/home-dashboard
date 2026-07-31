import { APPLIANCE_MANUAL_PDF_MIME } from './constants.js';

/**
 * @param {R2Bucket | undefined} bucket
 */
export function requireApplianceGuidesBucket(bucket) {
  if (!bucket) {
    const error = new Error('APPLIANCE_GUIDES_NOT_CONFIGURED');
    error.code = 'APPLIANCE_GUIDES_NOT_CONFIGURED';
    throw error;
  }
  return bucket;
}

/**
 * Server-generated opaque object key. Never trust client filenames for storage paths.
 */
export function generateObjectKey() {
  return `guides/${crypto.randomUUID()}.pdf`;
}

/**
 * @param {R2Bucket} bucket
 * @param {string} objectKey
 * @param {ArrayBuffer} buffer
 * @param {string} mimeType
 */
export async function putApplianceGuideObject(bucket, objectKey, buffer, mimeType = APPLIANCE_MANUAL_PDF_MIME) {
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
export async function deleteApplianceGuideObject(bucket, objectKey) {
  await bucket.delete(objectKey);
}

/**
 * @param {R2Bucket} bucket
 * @param {string} objectKey
 */
export async function getApplianceGuideObject(bucket, objectKey) {
  return bucket.get(objectKey);
}

/**
 * @param {R2Bucket} bucket
 * @param {string} objectKey
 */
export async function safeDeleteApplianceGuideObject(bucket, objectKey) {
  try {
    await deleteApplianceGuideObject(bucket, objectKey);
    return true;
  } catch {
    console.log(
      JSON.stringify({
        event: 'appliance_manual_r2_cleanup_failed',
        objectKeyPrefix: objectKey.slice(0, 12)
      })
    );
    return false;
  }
}
