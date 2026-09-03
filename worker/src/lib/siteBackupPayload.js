import { getHubSecretsForBackup, HUB_SECRET_KEYS, setHubSecrets } from './hubSecrets.js';
import { getSiteProfile, updateSiteProfile } from './siteProfile.js';
import { resolveSitterAccessEmailsManual } from '../routes/houseSettingsRoute.js';
import {
  getSitterSecretsManual,
  setSitterAccessEmails,
  setSitterSecretsManual
} from './houseSettings.js';
import { listSitterStays, replaceSitterStaysFromBackup, serializeSitterStayForApi } from './sitterStays.js';
import { applySitterStaySchedule } from './sitterSchedule.js';
import { importGuideCatalog, isHouseGuideSeeded, requireHouseGuideDb } from '../houseGuide/repository.js';
import { loadImportableGuideCatalog } from '../houseGuide/exportCatalog.js';
import { listApplianceManuals } from '../applianceManuals/repository.js';
import { toPublicManual } from '../applianceManuals/serialize.js';

export const SITE_BACKUP_FORMAT_VERSION = 2;
export const SITE_BACKUP_FORMAT_VERSION_LEGACY = 1;

/** @typedef {'full' | 'guide'} SiteBackupScope */

/**
 * @param {Record<string, string>} secretsMap
 */
export function exportHubSecretsForBackup(secretsMap) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of HUB_SECRET_KEYS) {
    const value = secretsMap[key]?.trim();
    if (value) out[key] = value;
  }
  return out;
}

/**
 * @param {Record<string, unknown>} hubSecrets
 */
export function hubSecretsForRestore(hubSecrets) {
  /** @type {Partial<Record<(typeof HUB_SECRET_KEYS)[number], string>>} */
  const patch = {};
  if (!hubSecrets || typeof hubSecrets !== 'object') return patch;
  for (const key of HUB_SECRET_KEYS) {
    if (hubSecrets[key] === undefined) continue;
    patch[key] = String(hubSecrets[key] ?? '');
  }
  return patch;
}

/**
 * @param {Record<string, unknown>} env
 * @param {{ scope?: SiteBackupScope }} [options]
 */
export async function buildSiteBackupPayload(env, options = {}) {
  const scope = options.scope === 'guide' ? 'guide' : 'full';
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  let seeded = false;
  try {
    seeded = await isHouseGuideSeeded(db);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'backup_guide_seed_check_failed',
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
  }

  let sitterSecretsManual = false;
  try {
    sitterSecretsManual = await getSitterSecretsManual(env);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'backup_sitter_secrets_failed',
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
  }

  /** @type {string[]} */
  let sitterAccessEmailsManual = [];
  try {
    sitterAccessEmailsManual = await resolveSitterAccessEmailsManual(env);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'backup_sitter_emails_failed',
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
  }

  /** @type {ReturnType<typeof serializeSitterStayForApi>[]} */
  let sitterStays = [];
  try {
    sitterStays = (await listSitterStays(env)).map(serializeSitterStayForApi);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'backup_sitter_stays_failed',
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
  }

  /** @type {{ seeded: boolean, catalog: object | null, uploadedMedia: { id: string, alt: string }[] }} */
  let guide = { seeded: false, catalog: null, uploadedMedia: [] };

  if (seeded) {
    try {
      const exported = await loadImportableGuideCatalog(db);
      guide = {
        seeded: true,
        catalog: exported?.catalog ?? null,
        uploadedMedia: exported?.uploadedMedia ?? []
      };
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'backup_guide_export_failed',
          detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
        })
      );
      guide = { seeded: true, catalog: null, uploadedMedia: [] };
    }
  }

  /** @type {Record<string, unknown>} */
  const payload = {
    formatVersion: SITE_BACKUP_FORMAT_VERSION,
    backupScope: scope,
    exportedAt: new Date().toISOString(),
    siteSettings: {
      sitterSecretsManual,
      sitterSecretsDisclosed: sitterSecretsManual,
      sitterAccessEmailsManual,
      sitterAccessEmails: sitterAccessEmailsManual,
      sitterStays
    },
    guide
  };

  if (scope === 'full') {
    try {
      payload.siteProfile = await getSiteProfile(env);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'backup_site_profile_failed',
          detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
        })
      );
      payload.siteProfile = null;
    }

    try {
      payload.hubSecrets = exportHubSecretsForBackup(await getHubSecretsForBackup(env));
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'backup_hub_secrets_failed',
          detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
        })
      );
      payload.hubSecrets = {};
    }

    try {
      const manualRows = await listApplianceManuals(db);
      payload.applianceManuals = manualRows.map((row) => ({
        ...toPublicManual(row),
        archivePath: `media/appliance-manuals/${row.id}-${String(row.original_filename ?? `${row.id}.pdf`).replace(/[^\w.-]+/g, '-')}`
      }));
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'backup_appliance_manuals_failed',
          detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
        })
      );
      payload.applianceManuals = [];
    }
  }

  return payload;
}

/**
 * @param {Record<string, unknown>} env
 * @param {Record<string, unknown>} payload
 */
export async function restoreSiteBackupPayload(env, payload) {
  const manualSecrets =
    payload.siteSettings?.sitterSecretsManual ??
    payload.siteSettings?.sitterSecretsDisclosed;
  if (manualSecrets !== undefined) {
    await setSitterSecretsManual(env, Boolean(manualSecrets));
  }

  const manualEmails =
    payload.siteSettings?.sitterAccessEmailsManual ?? payload.siteSettings?.sitterAccessEmails;
  if (Array.isArray(manualEmails)) {
    await setSitterAccessEmails(
      env,
      manualEmails.map((email) => String(email))
    );
  }

  if (Array.isArray(payload.siteSettings?.sitterStays)) {
    await replaceSitterStaysFromBackup(env, payload.siteSettings.sitterStays);
  }

  await applySitterStaySchedule(env);

  if (payload.siteProfile && typeof payload.siteProfile === 'object') {
    await updateSiteProfile(env, payload.siteProfile);
  }

  const secretPatch = hubSecretsForRestore(
    /** @type {Record<string, unknown>} */ (payload.hubSecrets ?? {})
  );
  if (Object.keys(secretPatch).length > 0) {
    await setHubSecrets(env, secretPatch);
  }

  if (payload.guide?.catalog && Array.isArray(payload.guide.catalog.categories)) {
    const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
    await importGuideCatalog(db, payload.guide.catalog);
  } else if (payload.backupScope === 'guide' || (!payload.siteProfile && !payload.hubSecrets)) {
    const profile = await getSiteProfile(env);
    if (profile.onboardingComplete !== true) {
      await updateSiteProfile(env, { onboardingComplete: true });
    }
  }

  return buildSiteBackupPayload(env, {
    scope: payload.backupScope === 'guide' ? 'guide' : 'full'
  });
}

/**
 * @param {string | null | undefined} value
 * @returns {SiteBackupScope}
 */
export function parseSiteBackupScope(value) {
  return value?.trim() === 'guide' ? 'guide' : 'full';
}
