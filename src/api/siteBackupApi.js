import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { formatOwnerUnlockInstructions } from '../lib/sitterUnlockPreferences.js';
import { withApiCredentials } from './accessFetch.js';
import { fetchHouseGuideCatalog, importHouseGuideCatalog } from './houseGuideApi.js';
import { fetchHouseSettings, postSitterSecretsDisclosed } from './houseSettingsApi.js';
import { buildSiteBackupDocument, buildGuideExportDocument, hasFullBackupContent, hubSecretsFromPrivateConfig } from '../utils/backupJson.js';
import { fetchSiteProfile, patchHubSecrets, patchSiteProfile } from './siteSetupApi.js';
import { fetchPrivateConfigFromApi } from './privateConfigApi.js';

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @param {string} [fallback]
 */
export function siteBackupErrorMessage(body, fallback = 'Request failed') {
  const code = typeof body?.error === 'object' && body?.error ? body.error.code : body?.code;
  if (code === 'DEVICE_MODE_REQUIRED') {
    return `Unlock owner mode first — ${formatOwnerUnlockInstructions()}`;
  }
  if (typeof body?.error?.message === 'string') return body.error.message;
  if (typeof body?.message === 'string') return body.message;
  if (typeof body?.error === 'string') return body.error;
  return fallback;
}

/**
 * @param {Response} response
 */
async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return siteBackupErrorMessage(body);
  } catch {
    /* ignore */
  }
  return 'Request failed';
}

/**
 * @param {typeof fetch} fetchImpl
 */
async function readSiteSettings(fetchImpl) {
  const settingsResult = await fetchHouseSettings(fetchImpl);
  return settingsResult.ok ? settingsResult.data : { sitterSecretsDisclosed: false };
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {'full' | 'guide'} scope
 */
async function fetchSiteBackupFromLegacyApis(fetchImpl, scope = 'full') {
  const [catalogResult, siteSettings] = await Promise.all([
    fetchHouseGuideCatalog({ fetchImpl, draft: true }),
    readSiteSettings(fetchImpl)
  ]);

  if (!catalogResult.ok) {
    return {
      ok: false,
      status: catalogResult.status,
      message: catalogResult.message || 'Could not export backup.',
      data: null
    };
  }

  const payload = catalogResult.data;
  const data = buildSiteBackupDocument(
    {
      seeded: payload?.seeded,
      catalog: payload?.catalog ?? null
    },
    siteSettings,
    { scope }
  );
  return {
    ok: true,
    status: 200,
    message: '',
    data: scope === 'full' ? await enrichFullSiteBackupPayload(data, fetchImpl) : data
  };
}

/**
 * @param {Record<string, unknown>} data
 */
function isFullBackupPayloadComplete(data) {
  return hasFullBackupContent(data);
}

/**
 * Fill profile/secrets when an older worker backup response only included guide content.
 *
 * @param {Record<string, unknown>} data
 * @param {typeof fetch} fetchImpl
 */
async function enrichFullSiteBackupPayload(data, fetchImpl) {
  if (isFullBackupPayloadComplete(data)) {
    return { ...data, backupScope: data.backupScope ?? 'full' };
  }

  const [profileResult, privateConfig] = await Promise.all([
    data.siteProfile ? Promise.resolve(null) : fetchSiteProfile({ fetchImpl }),
    fetchPrivateConfigFromApi(fetchImpl)
  ]);

  const siteProfile =
    data.siteProfile ??
    (profileResult?.ok ? profileResult.data?.profile : undefined);
  const hubSecrets = {
    ...hubSecretsFromPrivateConfig(privateConfig),
    ...(/** @type {Record<string, string>} */ (data.hubSecrets ?? {}))
  };

  return buildSiteBackupDocument(
    /** @type {{ seeded?: boolean, catalog?: Record<string, unknown> | null, uploadedMedia?: { id: string, alt: string }[] }} */ (
      data.guide ?? { seeded: false, catalog: null, uploadedMedia: [] }
    ),
    /** @type {{ sitterSecretsDisclosed?: boolean, sitterAccessEmails?: string[] }} */ (
      data.siteSettings ?? {}
    ),
    {
      scope: 'full',
      siteProfile: /** @type {Record<string, unknown>} */ (siteProfile),
      hubSecrets: Object.keys(hubSecrets).length > 0 ? hubSecrets : undefined
    }
  );
}

/**
 * @param {Record<string, unknown>} backup
 * @param {typeof fetch} fetchImpl
 */
async function restoreSiteBackupLegacy(backup, fetchImpl) {
  if (backup.siteSettings?.sitterSecretsDisclosed !== undefined) {
    const settingsResult = await postSitterSecretsDisclosed(
      Boolean(backup.siteSettings.sitterSecretsDisclosed),
      fetchImpl
    );
    if (!settingsResult.ok) {
      return {
        ok: false,
        status: settingsResult.status,
        message: settingsResult.message || 'Could not restore site settings.',
        data: null
      };
    }
  }

  if (backup.siteProfile && typeof backup.siteProfile === 'object') {
    const profileResult = await patchSiteProfile(
      /** @type {Record<string, unknown>} */ (backup.siteProfile),
      { fetchImpl }
    );
    if (!profileResult.ok) {
      return {
        ok: false,
        status: profileResult.status,
        message: profileResult.message || 'Could not restore home details.',
        data: null
      };
    }
  }

  if (backup.hubSecrets && typeof backup.hubSecrets === 'object') {
    /** @type {Record<string, string>} */
    const secretsPatch = {};
    for (const [key, value] of Object.entries(backup.hubSecrets)) {
      secretsPatch[key] = String(value ?? '');
    }
    if (Object.keys(secretsPatch).length > 0) {
      const secretsResult = await patchHubSecrets(secretsPatch, { fetchImpl });
      if (!secretsResult.ok) {
        return {
          ok: false,
          status: secretsResult.status,
          message: secretsResult.message || 'Could not restore saved secrets.',
          data: null
        };
      }
    }
  }

  const catalog = backup.guide?.catalog;
  if (catalog && Array.isArray(catalog.categories)) {
    const importResult = await importHouseGuideCatalog(catalog, { fetchImpl });
    if (!importResult.ok) {
      return {
        ok: false,
        status: importResult.status,
        message: importResult.message || 'Restore failed.',
        data: null
      };
    }
  }

  return fetchSiteBackup({ fetchImpl });
}

/**
 * @param {typeof fetch} fetchImpl
 */
async function fetchHouseGuideExportFromLegacyApis(fetchImpl) {
  const catalogResult = await fetchHouseGuideCatalog({ fetchImpl, draft: true });
  if (!catalogResult.ok) {
    return {
      ok: false,
      status: catalogResult.status,
      message: catalogResult.message || 'Could not export guide.',
      data: null
    };
  }

  const payload = catalogResult.data;
  if (!payload?.seeded && !payload?.catalog?.categories?.length) {
    return { ok: false, status: 404, message: 'House guide is not seeded yet.', data: null };
  }

  return {
    ok: true,
    status: 200,
    message: '',
    data: buildGuideExportDocument({ catalog: payload?.catalog ?? null })
  };
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchSiteBackupZip({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Backup is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/backup?format=zip&scope=full'),
      withApiCredentials({
        headers: { Accept: 'application/zip' },
        cache: 'no-store'
      })
    );

    if (response.ok) {
      return { ok: true, status: 200, message: '', data: await response.arrayBuffer() };
    }

    if (response.status === 404) {
      return {
        ok: false,
        status: 404,
        message: 'Full zip backup requires a hub worker update. Try again after the hub is updated.',
        data: null
      };
    }

    return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
  } catch {
    return { ok: false, status: 503, message: 'Backup is temporarily unavailable.', data: null };
  }
}

/**
 * @param {{ fetchImpl?: typeof fetch, scope?: 'full' | 'guide' }} [options]
 */
export async function fetchSiteBackup({ fetchImpl = fetch, scope = 'full' } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Backup is temporarily unavailable.', data: null };
  }

  const query = scope === 'guide' ? '?scope=guide' : '';

  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/site/backup${query}`),
      withApiCredentials({
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
    );

    if (response.ok) {
      const raw = await response.json();
      const data =
        scope === 'full' ? await enrichFullSiteBackupPayload(raw, fetchImpl) : raw;
      return { ok: true, status: 200, message: '', data };
    }

    if (response.status !== 404) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const exportResponse = await fetchImpl(
      buildApiUrl('/api/house-guide/export'),
      withApiCredentials({
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
    );

    if (exportResponse.ok) {
      const exportData = await exportResponse.json();
      const siteSettings = await readSiteSettings(fetchImpl);
      const data = buildSiteBackupDocument(
        {
          seeded: true,
          catalog: exportData.catalog ?? null,
          uploadedMedia: exportData.uploadedMedia
        },
        siteSettings,
        { scope }
      );
      return {
        ok: true,
        status: 200,
        message: '',
        data: scope === 'full' ? await enrichFullSiteBackupPayload(data, fetchImpl) : data
      };
    }

    if (exportResponse.status !== 404) {
      return {
        ok: false,
        status: exportResponse.status,
        message: await readErrorMessage(exportResponse),
        data: null
      };
    }

    return fetchSiteBackupFromLegacyApis(fetchImpl, scope);
  } catch {
    return { ok: false, status: 503, message: 'Backup is temporarily unavailable.', data: null };
  }
}

/**
 * @param {Record<string, unknown>} backup
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function restoreSiteBackup(backup, { fetchImpl = fetch, mediaZip = null } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Restore is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/restore'),
      withApiCredentials({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
        cache: 'no-store'
      })
    );

    if (response.ok) {
      const data = await response.json();
      if (mediaZip?.byteLength) {
        const mediaResult = await restoreSiteBackupMedia(mediaZip, { fetchImpl });
        if (!mediaResult.ok) {
          return {
            ok: false,
            status: mediaResult.status,
            message: mediaResult.message || 'Site data restored, but photos or manuals could not be restored.',
            data
          };
        }
        return { ok: true, status: 200, message: '', data: { ...data, media: mediaResult.data } };
      }
      return { ok: true, status: 200, message: '', data };
    }

    if (response.status !== 404) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    return restoreSiteBackupLegacy(backup, fetchImpl);
  } catch {
    return { ok: false, status: 503, message: 'Restore is temporarily unavailable.', data: null };
  }
}

/**
 * @param {Uint8Array} zipBytes
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function restoreSiteBackupMedia(zipBytes, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Restore is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/restore-media'),
      withApiCredentials({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/zip' },
        body: zipBytes,
        cache: 'no-store'
      })
    );

    if (response.ok) {
      const data = await response.json();
      return { ok: true, status: 200, message: '', data };
    }

    if (response.status === 404) {
      return {
        ok: false,
        status: 404,
        message: 'Photo and manual restore requires a hub worker update. Try again after the hub is updated.',
        data: null
      };
    }

    return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
  } catch {
    return { ok: false, status: 503, message: 'Restore is temporarily unavailable.', data: null };
  }
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchHouseGuideExport({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Export is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-guide/export'),
      withApiCredentials({
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
    );

    if (!response.ok) {
      if (response.status === 404) {
        return fetchHouseGuideExportFromLegacyApis(fetchImpl);
      }
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Export is temporarily unavailable.', data: null };
  }
}
