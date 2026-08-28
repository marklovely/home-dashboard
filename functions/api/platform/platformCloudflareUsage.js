import { manifestContractMissingUsageResponse } from './manifestContractCopy.js';

/** @typedef {Record<string, string | undefined>} PlatformEnv */

export const FREE_TIER_LIMITS = {
  r2StorageBytes: 10 * 1024 ** 3,
  d1StorageBytes: 5 * 1024 ** 3
};

/**
 * @param {PlatformEnv} env
 */
export function cloudflareUsageApiConfigured(env) {
  return Boolean(resolveCloudflareAccountId(env) && env.PLATFORM_CF_API_TOKEN?.trim());
}

/**
 * @param {PlatformEnv} env
 * @param {Record<string, unknown>} [platform]
 */
export function resolveCloudflareAccountId(env, platform = {}) {
  return (
    env.CLOUDFLARE_ACCOUNT_ID?.trim() ||
    env.PLATFORM_CF_ACCOUNT_ID?.trim() ||
    String(platform.cloudflareAccountId ?? '').trim() ||
    ''
  );
}

/**
 * @param {unknown} metrics
 */
export function extractAccountR2PayloadBytes(metrics) {
  if (!metrics || typeof metrics !== 'object') return 0;

  /** @type {Record<string, unknown>} */
  const root = metrics;
  let total = 0;

  for (const storageClass of ['standard', 'infrequent_access']) {
    const bucketClass = root[storageClass];
    if (!bucketClass || typeof bucketClass !== 'object') continue;

    const published = /** @type {Record<string, unknown>} */ (bucketClass).published;
    if (!published || typeof published !== 'object') continue;
    const payload = Number(/** @type {Record<string, unknown>} */ (published).payloadSize);
    if (Number.isFinite(payload) && payload > 0) {
      total += payload;
    }
  }

  return total;
}

/**
 * @param {unknown} bucketUsage
 */
export function normalizeR2BucketUsage(bucketUsage) {
  if (!bucketUsage || typeof bucketUsage !== 'object') {
    return { payloadSizeBytes: 0, metadataSizeBytes: 0, objectCount: 0 };
  }

  /** @type {Record<string, unknown>} */
  const raw = bucketUsage;
  return {
    payloadSizeBytes: Number(raw.payloadSize ?? raw.payload_size ?? 0) || 0,
    metadataSizeBytes: Number(raw.metadataSize ?? raw.metadata_size ?? 0) || 0,
    objectCount: Number(raw.objectCount ?? raw.object_count ?? 0) || 0
  };
}

/**
 * @param {unknown} database
 */
export function normalizeD1DatabaseUsage(database) {
  if (!database || typeof database !== 'object') {
    return { fileSizeBytes: 0, numTables: null };
  }

  /** @type {Record<string, unknown>} */
  const raw = database;
  const numTablesRaw = raw.num_tables ?? raw.numTables;
  return {
    fileSizeBytes: Number(raw.file_size ?? raw.fileSize ?? 0) || 0,
    numTables: numTablesRaw === undefined || numTablesRaw === null ? null : Number(numTablesRaw)
  };
}

/**
 * @param {string} path
 * @param {PlatformEnv} env
 */
async function cloudflareApiGet(path, env) {
  const token = env.PLATFORM_CF_API_TOKEN?.trim();
  if (!token) {
    throw new Error('PLATFORM_CF_API_TOKEN is not configured.');
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const message = body.errors?.[0]?.message ?? `Cloudflare API error (${response.status})`;
    throw new Error(message);
  }

  return body.result;
}

/**
 * @param {string} accountId
 * @param {string} databaseId
 * @param {PlatformEnv} env
 */
export async function fetchD1DatabaseUsage(accountId, databaseId, env) {
  const result = await cloudflareApiGet(
    `/accounts/${encodeURIComponent(accountId)}/d1/database/${encodeURIComponent(databaseId)}`,
    env
  );
  return normalizeD1DatabaseUsage(result);
}

/**
 * @param {string} accountId
 * @param {string} bucketName
 * @param {PlatformEnv} env
 */
export async function fetchR2BucketUsage(accountId, bucketName, env) {
  const result = await cloudflareApiGet(
    `/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/usage`,
    env
  );
  return normalizeR2BucketUsage(result);
}

/**
 * @param {string} accountId
 * @param {PlatformEnv} env
 */
export async function fetchAccountR2Usage(accountId, env) {
  const result = await cloudflareApiGet(
    `/accounts/${encodeURIComponent(accountId)}/r2/metrics`,
    env
  );
  return {
    totalBytes: extractAccountR2PayloadBytes(result),
    limitBytes: FREE_TIER_LIMITS.r2StorageBytes
  };
}

/**
 * @param {Record<string, unknown>} site
 * @param {Record<string, unknown>} platform
 * @param {PlatformEnv} env
 */
export async function fetchSiteStorageUsage(site, platform, env) {
  if (!cloudflareUsageApiConfigured(env)) {
    return {
      ok: false,
      error: 'NOT_CONFIGURED',
      message:
        'Set PLATFORM_CF_API_TOKEN (Account → Workers R2 Storage → Read) and CLOUDFLARE_ACCOUNT_ID on the platform Pages project.'
    };
  }

  const accountId = resolveCloudflareAccountId(env, platform);
  if (!accountId) {
    return {
      ok: false,
      error: 'NO_ACCOUNT_ID',
      message: 'Cloudflare account ID is missing from platform env or manifest.'
    };
  }

  /** @type {Record<string, unknown> | null | undefined} */
  const contract = site.contract;
  if (!contract?.d1_database_id) {
    return manifestContractMissingUsageResponse();
  }

  try {
    const d1DatabaseId = String(contract.d1_database_id);
    const guidesBucket = contract.r2_guides_bucket ? String(contract.r2_guides_bucket) : '';
    const mediaBucket = contract.r2_media_bucket ? String(contract.r2_media_bucket) : '';

    const [d1, guides, media] = await Promise.all([
      fetchD1DatabaseUsage(accountId, d1DatabaseId, env),
      guidesBucket ? fetchR2BucketUsage(accountId, guidesBucket, env) : Promise.resolve(null),
      mediaBucket ? fetchR2BucketUsage(accountId, mediaBucket, env) : Promise.resolve(null)
    ]);

    const r2GuidesBytes = guides?.payloadSizeBytes ?? 0;
    const r2MediaBytes = media?.payloadSizeBytes ?? 0;

    return {
      ok: true,
      siteId: String(site.siteId ?? ''),
      checkedAt: new Date().toISOString(),
      d1: {
        ...d1,
        databaseId: d1DatabaseId,
        databaseName: String(contract.d1_database_name ?? ''),
        limitBytes: FREE_TIER_LIMITS.d1StorageBytes
      },
      r2: {
        guides: guides
          ? { bucket: guidesBucket, ...guides, limitBytes: FREE_TIER_LIMITS.r2StorageBytes }
          : null,
        media: media
          ? { bucket: mediaBucket, ...media, limitBytes: FREE_TIER_LIMITS.r2StorageBytes }
          : null,
        totalBytes: r2GuidesBytes + r2MediaBytes,
        limitBytes: FREE_TIER_LIMITS.r2StorageBytes
      },
      freeTier: FREE_TIER_LIMITS
    };
  } catch (error) {
    return {
      ok: false,
      error: 'CF_API_ERROR',
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * @param {object} manifest
 * @param {PlatformEnv} env
 */
export async function fetchAccountStorageSummary(manifest, env) {
  if (!cloudflareUsageApiConfigured(env)) {
    return {
      ok: false,
      error: 'NOT_CONFIGURED',
      message:
        'Set PLATFORM_CF_API_TOKEN (Account → Workers R2 Storage → Read) and CLOUDFLARE_ACCOUNT_ID on the platform Pages project.'
    };
  }

  const platform = manifest.platform ?? {};
  const accountId = resolveCloudflareAccountId(env, platform);
  if (!accountId) {
    return {
      ok: false,
      error: 'NO_ACCOUNT_ID',
      message: 'Cloudflare account ID is missing from platform env or manifest.'
    };
  }

  try {
    const sites = Object.values(manifest.sites ?? {});
    const provisioned = sites.filter((site) => site?.contract?.d1_database_id);

    const [accountR2, d1Usages] = await Promise.all([
      fetchAccountR2Usage(accountId, env),
      Promise.all(
        provisioned.map(async (site) => {
          const contract = site.contract;
          const usage = await fetchD1DatabaseUsage(accountId, String(contract.d1_database_id), env);
          return {
            siteId: String(site.siteId ?? ''),
            fileSizeBytes: usage.fileSizeBytes
          };
        })
      )
    ]);

    const d1TotalBytes = d1Usages.reduce((sum, row) => sum + row.fileSizeBytes, 0);

    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      accountId,
      r2: accountR2,
      d1: {
        totalBytes: d1TotalBytes,
        limitBytes: FREE_TIER_LIMITS.d1StorageBytes,
        hubs: d1Usages
      },
      freeTier: FREE_TIER_LIMITS,
      hubCount: provisioned.length
    };
  } catch (error) {
    return {
      ok: false,
      error: 'CF_API_ERROR',
      message: error instanceof Error ? error.message : String(error)
    };
  }
}
