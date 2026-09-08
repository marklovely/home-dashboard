import { manifestContractMissingUsageResponse } from './manifestContractCopy.js';

/** @typedef {Record<string, string | undefined>} PlatformEnv */
/** @typedef {'free' | 'paid'} CloudflareWorkersPlan */

export const FREE_TIER_LIMITS = {
  r2StorageBytes: 10 * 1024 ** 3,
  d1StorageBytes: 5 * 1024 ** 3
};

/** @deprecated Use resolveCloudflarePlanLimits().d1DatabaseCountLimit */
export const D1_DATABASE_COUNT_LIMIT = 10;

/** @type {Record<CloudflareWorkersPlan, {
 *   workersPlan: CloudflareWorkersPlan,
 *   workersPlanLabel: string,
 *   r2PlanLabel: string,
 *   r2StorageLimitBytes: number | null,
 *   r2ShowLimit: boolean,
 *   d1AccountStorageLimitBytes: number,
 *   d1DatabaseCountLimit: number,
 *   d1PerDatabaseLimitBytes: number
 * }>} */
export const CLOUDFLARE_PLAN_LIMITS = {
  free: {
    workersPlan: 'free',
    workersPlanLabel: 'Workers Free',
    r2PlanLabel: 'R2 Free',
    r2StorageLimitBytes: 10 * 1024 ** 3,
    r2ShowLimit: true,
    d1AccountStorageLimitBytes: 5 * 1024 ** 3,
    d1DatabaseCountLimit: 10,
    d1PerDatabaseLimitBytes: 500 * 1024 ** 2
  },
  paid: {
    workersPlan: 'paid',
    workersPlanLabel: 'Workers Paid',
    r2PlanLabel: 'R2 Paid',
    r2StorageLimitBytes: null,
    r2ShowLimit: false,
    d1AccountStorageLimitBytes: 1024 ** 4,
    d1DatabaseCountLimit: 50_000,
    d1PerDatabaseLimitBytes: 10 * 1024 ** 3
  }
};

/**
 * @param {unknown} value
 * @returns {CloudflareWorkersPlan}
 */
export function normalizeCloudflareWorkersPlan(value) {
  return String(value ?? '').trim().toLowerCase() === 'paid' ? 'paid' : 'free';
}

/**
 * @param {PlatformEnv} env
 * @param {Record<string, unknown>} [platform]
 */
export function resolveCloudflarePlanLimits(env, platform = {}) {
  const workersPlan = normalizeCloudflareWorkersPlan(
    env.PLATFORM_CF_WORKERS_PLAN ?? platform.cloudflareWorkersPlan
  );
  const limits = CLOUDFLARE_PLAN_LIMITS[workersPlan];
  const r2Plan = normalizeCloudflareWorkersPlan(
    env.PLATFORM_CF_R2_PLAN ?? platform.cloudflareR2Plan ?? workersPlan
  );
  if (r2Plan === limits.workersPlan) {
    return limits;
  }
  const r2Limits = CLOUDFLARE_PLAN_LIMITS[r2Plan];
  return {
    ...limits,
    r2PlanLabel: r2Limits.r2PlanLabel,
    r2StorageLimitBytes: r2Limits.r2StorageLimitBytes,
    r2ShowLimit: r2Limits.r2ShowLimit
  };
}

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
 * @param {Record<string, unknown>} [platform]
 */
export async function fetchAccountR2Usage(accountId, env, platform = {}) {
  const plan = resolveCloudflarePlanLimits(env, platform);
  const result = await cloudflareApiGet(
    `/accounts/${encodeURIComponent(accountId)}/r2/metrics`,
    env
  );
  return {
    totalBytes: extractAccountR2PayloadBytes(result),
    limitBytes: plan.r2StorageLimitBytes,
    showLimit: plan.r2ShowLimit
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
    const plan = resolveCloudflarePlanLimits(env, platform);
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
    const r2LimitBytes = plan.r2StorageLimitBytes;

    return {
      ok: true,
      siteId: String(site.siteId ?? ''),
      checkedAt: new Date().toISOString(),
      plan,
      d1: {
        ...d1,
        databaseId: d1DatabaseId,
        databaseName: String(contract.d1_database_name ?? ''),
        limitBytes: plan.d1PerDatabaseLimitBytes
      },
      r2: {
        guides: guides
          ? { bucket: guidesBucket, ...guides, limitBytes: r2LimitBytes, showLimit: plan.r2ShowLimit }
          : null,
        media: media
          ? { bucket: mediaBucket, ...media, limitBytes: r2LimitBytes, showLimit: plan.r2ShowLimit }
          : null,
        totalBytes: r2GuidesBytes + r2MediaBytes,
        limitBytes: r2LimitBytes,
        showLimit: plan.r2ShowLimit
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
    const plan = resolveCloudflarePlanLimits(env, platform);
    const sites = Object.values(manifest.sites ?? {});
    const provisioned = sites.filter((site) => site?.contract?.d1_database_id);

    const [accountR2, d1Usages] = await Promise.all([
      fetchAccountR2Usage(accountId, env, platform),
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
      plan,
      r2: accountR2,
      d1: {
        totalBytes: d1TotalBytes,
        limitBytes: plan.d1AccountStorageLimitBytes,
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

/**
 * @param {string} accountId
 * @param {PlatformEnv} env
 * @param {Record<string, unknown>} [platform]
 */
export async function fetchAccountResourceInventory(accountId, env, platform = {}) {
  const plan = resolveCloudflarePlanLimits(env, platform);
  const [d1Result, r2Result, workersResult, pagesResult] = await Promise.allSettled([
    cloudflareApiGet(`/accounts/${encodeURIComponent(accountId)}/d1/database`, env),
    cloudflareApiGet(`/accounts/${encodeURIComponent(accountId)}/r2/buckets`, env),
    cloudflareApiGet(`/accounts/${encodeURIComponent(accountId)}/workers/scripts`, env),
    cloudflareApiGet(`/accounts/${encodeURIComponent(accountId)}/pages/projects`, env)
  ]);

  /** @type {Record<string, unknown>[]} */
  const d1Databases = d1Result.status === 'fulfilled' && Array.isArray(d1Result.value) ? d1Result.value : [];
  /** @type {Record<string, unknown>[]} */
  const r2Buckets =
    r2Result.status === 'fulfilled'
      ? Array.isArray(r2Result.value)
        ? r2Result.value
        : Array.isArray(/** @type {Record<string, unknown>} */ (r2Result.value)?.buckets)
          ? /** @type {Record<string, unknown>[]} */ (/** @type {Record<string, unknown>} */ (r2Result.value).buckets)
          : []
      : [];
  /** @type {string[]} */
  const workerScripts =
    workersResult.status === 'fulfilled' && Array.isArray(workersResult.value)
      ? workersResult.value.map((row) => String(row))
      : [];
  /** @type {Record<string, unknown>[]} */
  const pagesProjects =
    pagesResult.status === 'fulfilled' && Array.isArray(pagesResult.value) ? pagesResult.value : [];

  const errors = [];
  if (d1Result.status === 'rejected') errors.push({ resource: 'd1', message: String(d1Result.reason) });
  if (r2Result.status === 'rejected') errors.push({ resource: 'r2', message: String(r2Result.reason) });
  if (workersResult.status === 'rejected') {
    errors.push({ resource: 'workers', message: String(workersResult.reason) });
  }
  if (pagesResult.status === 'rejected') {
    errors.push({ resource: 'pages', message: String(pagesResult.reason) });
  }

  return {
    ok: errors.length < 4,
    d1: {
      count: d1Databases.length,
      limit: plan.d1DatabaseCountLimit,
      databases: d1Databases.map((row) => ({
        id: String(row.uuid ?? row.id ?? ''),
        name: String(row.name ?? '')
      }))
    },
    r2: {
      count: r2Buckets.length,
      buckets: r2Buckets.map((row) => String(row.name ?? ''))
    },
    workers: { count: workerScripts.length, scripts: workerScripts },
    pages: {
      count: pagesProjects.length,
      projects: pagesProjects.map((row) => String(row.name ?? row.subdomain ?? ''))
    },
    errors
  };
}
