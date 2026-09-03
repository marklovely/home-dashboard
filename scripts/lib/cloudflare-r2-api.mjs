/**
 * Cloudflare R2 object list/delete via REST API (for deprovision bucket emptying).
 */

const DEFAULT_LIST_LIMIT = 1000;
const DEFAULT_DELETE_BATCH = 1000;

/**
 * @param {number} status
 * @param {unknown} body
 * @param {string} bucketName
 */
export function isR2BucketNotFoundError(status, body, bucketName) {
  if (status !== 404) return false;
  const message = String(
    body?.errors?.map((entry) => entry.message).filter(Boolean).join('; ') ?? ''
  ).toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('not found') ||
    message.includes(`bucket "${bucketName.toLowerCase()}"`)
  );
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} bucketName
 * @param {{ prefix?: string, cursor?: string, limit?: number }} [options]
 */
async function listR2Objects(accountId, token, bucketName, options = {}) {
  const params = new URLSearchParams();
  params.set('per_page', String(options.limit ?? DEFAULT_LIST_LIMIT));
  if (options.prefix?.trim()) params.set('prefix', options.prefix.trim());
  if (options.cursor?.trim()) params.set('cursor', options.cursor.trim());

  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/objects?${params}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (isR2BucketNotFoundError(response.status, body, bucketName)) {
      return { bucketMissing: true, result: [], result_info: { is_truncated: false } };
    }
    const message =
      body?.errors?.map((entry) => entry.message).filter(Boolean).join('; ') ||
      `HTTP ${response.status}`;
    throw new Error(`R2 list failed for bucket "${bucketName}": ${message}`);
  }
  return body;
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} bucketName
 * @param {string} key
 */
async function deleteR2Object(accountId, token, bucketName, key) {
  const objectKey = encodeURIComponent(key).replace(/%2F/g, '/');
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/objects/${objectKey}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      body?.errors?.map((entry) => entry.message).filter(Boolean).join('; ') ||
      `HTTP ${response.status}`;
    throw new Error(`R2 delete failed for bucket "${bucketName}" key "${key}": ${message}`);
  }
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} bucketName
 * @param {string[]} keys
 */
async function deleteR2Objects(accountId, token, bucketName, keys) {
  const concurrency = 25;
  for (let index = 0; index < keys.length; index += concurrency) {
    const batch = keys.slice(index, index + concurrency);
    await Promise.all(batch.map((key) => deleteR2Object(accountId, token, bucketName, key)));
  }
}

/**
 * Delete every object in an R2 bucket so Terraform can destroy it.
 *
 * @param {string} bucketName
 * @param {{ accountId: string, token: string, onProgress?: (message: string) => void }} options
 * @returns {Promise<number>} number of objects deleted (0 when bucket is missing)
 */
export async function emptyR2Bucket(bucketName, options) {
  const accountId = options.accountId.trim();
  const token = options.token.trim();
  const name = bucketName.trim();
  if (!accountId || !token || !name) {
    throw new Error('emptyR2Bucket requires accountId, token, and bucketName.');
  }

  let cursor;
  let deleted = 0;
  let missing = false;

  for (;;) {
    const page = await listR2Objects(accountId, token, name, { cursor });
    if (page?.bucketMissing === true) {
      missing = true;
      options.onProgress?.(`Bucket ${name} does not exist — skipping`);
      break;
    }
    const objects = Array.isArray(page?.result) ? page.result : [];
    const keys = objects
      .map((entry) => String(entry?.key ?? '').trim())
      .filter(Boolean);

    for (let index = 0; index < keys.length; index += DEFAULT_DELETE_BATCH) {
      const batch = keys.slice(index, index + DEFAULT_DELETE_BATCH);
      await deleteR2Objects(accountId, token, name, batch);
      deleted += batch.length;
      options.onProgress?.(`Deleted ${deleted} object(s) from ${name}`);
    }

    const nextCursor = String(page?.result_info?.cursor ?? '').trim();
    const truncated = page?.result_info?.is_truncated === true;
    if (!truncated || !nextCursor || objects.length === 0) break;
    cursor = nextCursor;
  }

  if (missing) return { deleted: 0, missing: true };
  return { deleted, missing: false };
}

/**
 * @param {string} bucketName
 * @param {string} objectKey
 * @param {{ accountId: string, token: string }} options
 */
export async function getR2ObjectText(bucketName, objectKey, options) {
  const accountId = options.accountId.trim();
  const token = options.token.trim();
  const bucket = bucketName.trim();
  const key = objectKey.trim();
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodedKey}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body?.errors?.map((entry) => entry.message).filter(Boolean).join('; ') ||
      `HTTP ${response.status}`;
    throw new Error(`R2 get failed for bucket "${bucket}" key "${key}": ${message}`);
  }
  return response.text();
}
