import { zipSync, unzipSync } from 'fflate';
import {
  listApplianceManuals,
  requireApplianceManualsDb,
  updateApplianceManual
} from '../applianceManuals/repository.js';
import {
  generateObjectKey,
  getApplianceGuideObject,
  putApplianceGuideObject,
  safeDeleteApplianceGuideObject
} from '../applianceManuals/r2Storage.js';
import { sanitizeOriginalFilename } from '../applianceManuals/sanitize.js';
import {
  getGuideMediaById,
  insertGuideMedia,
  requireHouseGuideDb
} from '../houseGuide/repository.js';
import {
  generateGuideMediaObjectKey,
  getGuideMediaObject,
  putGuideMediaObject,
  safeDeleteGuideMediaObject
} from '../houseGuide/r2Storage.js';
import { buildSiteBackupPayload } from './siteBackupPayload.js';

/**
 * @param {R2ObjectBody | { body?: ArrayBuffer | Uint8Array, httpMetadata?: { contentType?: string } } | null} object
 */
async function readR2ObjectBytes(object) {
  if (!object) return null;
  if (typeof object.arrayBuffer === 'function') {
    return new Uint8Array(await object.arrayBuffer());
  }
  if (object.body instanceof Uint8Array) {
    return object.body;
  }
  if (object.body instanceof ArrayBuffer) {
    return new Uint8Array(object.body);
  }
  return null;
}

/**
 * @param {string | null | undefined} mimeType
 */
function extensionForMime(mimeType) {
  const mime = String(mimeType ?? '').toLowerCase();
  if (mime.includes('jpeg') || mime === 'image/jpg') return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('pdf')) return 'pdf';
  return 'bin';
}

/**
 * @param {string} filename
 */
function safeArchiveFilename(filename) {
  const base = String(filename ?? 'file').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'file';
}

/**
 * @param {Record<string, unknown>} env
 * @param {{ scope?: 'full' | 'guide' }} [options]
 */
export async function buildSiteBackupZipBytes(env, options = {}) {
  const payload = await buildSiteBackupPayload(env, options);
  /** @type {Record<string, Uint8Array>} */
  const files = {};
  files['backup.json'] = new TextEncoder().encode(`${JSON.stringify(payload, null, 2)}\n`);

  if (options.scope !== 'guide') {
    const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
    const mediaRows =
      (await db
        .prepare(`SELECT id, object_key, mime_type FROM guide_media WHERE object_key IS NOT NULL AND object_key != ''`)
        .all()).results ?? [];

    const guideBucket = env.GUIDE_MEDIA;
    if (guideBucket) {
      for (const row of mediaRows) {
        const id = String(row.id);
        const objectKey = String(row.object_key);
        try {
          const object = await getGuideMediaObject(/** @type {R2Bucket} */ (guideBucket), objectKey);
          const bytes = await readR2ObjectBytes(object);
          if (!bytes) continue;
          const ext = extensionForMime(String(row.mime_type ?? object.httpMetadata?.contentType));
          files[`media/photos/${id}.${ext}`] = bytes;
        } catch {
          /* skip missing photo */
        }
      }
    }

    const manualRows = await listApplianceManuals(db);
    const manualsBucket = env.APPLIANCE_GUIDES;
    if (manualsBucket) {
      for (const row of manualRows) {
        if (!row.object_key) continue;
        try {
          const object = await getApplianceGuideObject(
            /** @type {R2Bucket} */ (manualsBucket),
            row.object_key
          );
          const bytes = await readR2ObjectBytes(object);
          if (!bytes) continue;
          const ext = extensionForMime(String(row.mime_type ?? object.httpMetadata?.contentType));
          const name = safeArchiveFilename(row.original_filename || `${row.id}.${ext}`);
          files[`media/appliance-manuals/${row.id}-${name}`] = bytes;
        } catch {
          /* skip missing manual */
        }
      }
    }
  }

  return zipSync(files, { level: 6 });
}

/**
 * @param {string} extension
 */
function mimeTypeFromExtension(extension) {
  switch (String(extension ?? '').toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

/**
 * @param {Record<string, Uint8Array>} files
 */
export function countArchiveMediaFiles(files) {
  return Object.keys(files).filter((path) => path.startsWith('media/')).length;
}

/**
 * @param {Uint8Array} zipBytes
 */
export function unzipSiteBackupArchive(zipBytes) {
  return unzipSync(zipBytes);
}

/**
 * @param {Record<string, unknown>} env
 * @param {Record<string, Uint8Array>} files
 */
export async function restoreSiteBackupMediaFromFiles(env, files) {
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const manualsDb = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB ?? env.HOUSE_GUIDE_DB);
  const guideBucket = env.GUIDE_MEDIA;
  const manualsBucket = env.APPLIANCE_GUIDES;

  /** @type {import('../applianceManuals/serialize.js').ApplianceManualRecord[]} */
  const manualRows = await listApplianceManuals(manualsDb);

  let photosRestored = 0;
  let manualsRestored = 0;

  for (const [path, bytes] of Object.entries(files)) {
    if (path.startsWith('media/photos/')) {
      const match = path.match(/^media\/photos\/([^./]+)\.([a-z0-9]+)$/i);
      if (!match || !guideBucket) continue;
      const mediaId = match[1];
      const mimeType = mimeTypeFromExtension(match[2]);
      const objectKey = generateGuideMediaObjectKey();
      await putGuideMediaObject(/** @type {R2Bucket} */ (guideBucket), objectKey, bytes, mimeType);

      const existing = await getGuideMediaById(db, mediaId);
      if (existing?.object_key) {
        await safeDeleteGuideMediaObject(
          /** @type {R2Bucket} */ (guideBucket),
          String(existing.object_key)
        );
      }

      if (existing) {
        await db
          .prepare(
            `UPDATE guide_media SET alt = ?, object_key = ?, source_file = NULL, original_filename = ?, mime_type = ?, file_size = ?, updated_at = ? WHERE id = ?`
          )
          .bind(
            existing.alt ?? '',
            objectKey,
            `${mediaId}.${match[2]}`,
            mimeType,
            bytes.byteLength,
            new Date().toISOString(),
            mediaId
          )
          .run();
      } else {
        await insertGuideMedia(db, {
          id: mediaId,
          alt: mediaId,
          objectKey,
          originalFilename: `${mediaId}.${match[2]}`,
          mimeType,
          fileSize: bytes.byteLength
        });
      }
      photosRestored += 1;
      continue;
    }

    if (path.startsWith('media/appliance-manuals/') && manualsBucket) {
      const remainder = path.slice('media/appliance-manuals/'.length);
      const manual = manualRows.find((row) => remainder.startsWith(`${row.id}-`));
      if (!manual) continue;

      const filename = remainder.slice(manual.id.length + 1) || manual.original_filename || 'manual.pdf';
      const mimeType = mimeTypeFromExtension(filename.split('.').pop());
      const objectKey = generateObjectKey();
      await putApplianceGuideObject(/** @type {R2Bucket} */ (manualsBucket), objectKey, bytes, mimeType);

      if (manual.object_key && manual.object_key !== objectKey) {
        await safeDeleteApplianceGuideObject(
          /** @type {R2Bucket} */ (manualsBucket),
          String(manual.object_key)
        );
      }

      await updateApplianceManual(manualsDb, manual.id, {
        objectKey,
        originalFilename: sanitizeOriginalFilename(filename),
        mimeType,
        fileSize: bytes.byteLength,
        updatedAt: new Date().toISOString()
      });
      manualsRestored += 1;
    }
  }

  return { photosRestored, manualsRestored };
}

/**
 * @param {Record<string, unknown>} env
 * @param {Uint8Array} zipBytes
 */
export async function restoreSiteBackupMediaFromZip(env, zipBytes) {
  const files = unzipSiteBackupArchive(zipBytes);
  return restoreSiteBackupMediaFromFiles(env, files);
}
