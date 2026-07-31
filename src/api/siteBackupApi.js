import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';
import { fetchHouseGuideCatalog, importHouseGuideCatalog } from './houseGuideApi.js';
import { fetchHouseSettings, postSitterSecretsDisclosed } from './houseSettingsApi.js';
import { buildSiteBackupDocument, buildGuideExportDocument } from '../utils/backupJson.js';

/**
 * @param {Response} response
 */
async function readErrorMessage(response) {
  try {
    const body = await response.json();
    if (typeof body?.error?.message === 'string') return body.error.message;
    if (typeof body?.message === 'string') return body.message;
    if (typeof body?.error === 'string') return body.error;
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
 */
async function fetchSiteBackupFromLegacyApis(fetchImpl) {
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
  return {
    ok: true,
    status: 200,
    message: '',
    data: buildSiteBackupDocument(
      {
        seeded: payload?.seeded,
        catalog: payload?.catalog ?? null
      },
      siteSettings
    )
  };
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
export async function fetchSiteBackup({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Backup is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/backup'),
      withApiCredentials({
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
    );

    if (response.ok) {
      const data = await response.json();
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
      return {
        ok: true,
        status: 200,
        message: '',
        data: buildSiteBackupDocument(
          {
            seeded: true,
            catalog: exportData.catalog ?? null,
            uploadedMedia: exportData.uploadedMedia
          },
          siteSettings
        )
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

    return fetchSiteBackupFromLegacyApis(fetchImpl);
  } catch {
    return { ok: false, status: 503, message: 'Backup is temporarily unavailable.', data: null };
  }
}

/**
 * @param {Record<string, unknown>} backup
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function restoreSiteBackup(backup, { fetchImpl = fetch } = {}) {
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
