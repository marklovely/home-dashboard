import { zipSync } from 'fflate';
import { listApplianceManuals } from '../applianceManuals/repository.js';
import { getApplianceGuideObject } from '../applianceManuals/r2Storage.js';
import { getGuideMediaObject } from '../houseGuide/r2Storage.js';
import { requireHouseGuideDb } from '../houseGuide/repository.js';
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
